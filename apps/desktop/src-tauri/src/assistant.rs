//! The assistant's connection to OpenAI.
//!
//! The API key is stored in the Mac's keychain and read only here. The web
//! view can save a key, remove it and ask whether one exists, but it can
//! never read it back: requests to OpenAI are made from this side, to one
//! fixed address, with the key added on the way out.

use std::time::Duration;

use keyring::Entry;
use serde_json::Value;

const KEY_SERVICE: &str = "com.konguito06.atlas";
const KEY_ACCOUNT: &str = "openai-api-key";
const OPENAI_URL: &str = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(90);

fn key_entry() -> Result<Entry, String> {
    Entry::new(KEY_SERVICE, KEY_ACCOUNT)
        .map_err(|_| "The keychain could not be opened.".to_string())
}

fn read_key() -> Result<Option<String>, String> {
    match key_entry()?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("The key could not be read from the keychain.".to_string()),
    }
}

/// Whether a key is saved. The key itself is never returned.
#[tauri::command]
pub fn assistant_has_key() -> Result<bool, String> {
    Ok(read_key()?.is_some())
}

#[tauri::command]
pub fn assistant_save_key(key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Enter a key.".to_string());
    }
    key_entry()?
        .set_password(key)
        .map_err(|_| "The key could not be saved to the keychain.".to_string())
}

#[tauri::command]
pub fn assistant_remove_key() -> Result<(), String> {
    match key_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("The key could not be removed from the keychain.".to_string()),
    }
}

/// Sends one chat request to OpenAI and returns its JSON answer. Errors are
/// sentences fit to show a person; they never contain the key.
#[tauri::command]
pub async fn assistant_complete(body: Value) -> Result<Value, String> {
    let key = read_key()?
        .ok_or_else(|| "No OpenAI key is saved. Add one in Settings.".to_string())?;

    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|_| "The request to OpenAI could not be prepared.".to_string())?;
    let response = client
        .post(OPENAI_URL)
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "OpenAI took too long to answer. Try again.".to_string()
            } else {
                "OpenAI could not be reached. Check the internet connection.".to_string()
            }
        })?;

    let status = response.status();
    let payload: Value = response
        .json()
        .await
        .map_err(|_| "OpenAI's answer could not be read.".to_string())?;
    if status.is_success() {
        return Ok(payload);
    }

    Err(match status.as_u16() {
        401 => "OpenAI did not accept the key. Check it in Settings.".to_string(),
        429 => "OpenAI refused the request: the account has no credit left, or is being used too fast.".to_string(),
        _ => match payload["error"]["message"].as_str() {
            Some(message) => format!("OpenAI answered with an error: {message}"),
            None => format!("OpenAI answered with an error ({status})."),
        },
    })
}

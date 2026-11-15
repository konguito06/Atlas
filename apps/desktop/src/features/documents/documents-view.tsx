import { type AtlasData, useDocuments, useFolders } from "@atlas/core";
import { useState } from "react";
import { DocumentPane } from "./document-pane";
import { LibraryView } from "./library-view";

/** The Documents section: the library, or the document opened from it. */
export function DocumentsView({
  data,
  workspaceId,
  initialDocumentId,
}: {
  data: AtlasData;
  workspaceId: string;
  /** The document to show first, when arriving from a link to it. */
  initialDocumentId?: string;
}) {
  const documents = useDocuments(data, workspaceId);
  const folders = useFolders(data, workspaceId);
  const [openId, setOpenId] = useState(initialDocumentId);
  const open = documents.data?.find((document) => document.id === openId);

  // While an opened document is still loading, show nothing instead of
  // flashing the library first.
  if (openId && documents.isPending) return null;

  return open ? (
    <DocumentPane
      key={open.id}
      data={data}
      workspaceId={workspaceId}
      document={open}
      folders={folders.data ?? []}
      onBack={() => setOpenId(undefined)}
    />
  ) : (
    <LibraryView data={data} workspaceId={workspaceId} onOpen={setOpenId} />
  );
}

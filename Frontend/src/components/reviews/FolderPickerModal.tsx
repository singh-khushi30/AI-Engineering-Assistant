"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUp,
  Check,
  Folder,
  FolderOpen,
  Home,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/http";
import { filesystemService, type BrowseResponse } from "@/services/filesystem.service";
import { cn } from "@/lib/utils";

type FolderPickerModalProps = {
  open: boolean;
  initialPath?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
};

export function FolderPickerModal({
  open,
  initialPath,
  onClose,
  onSelect,
}: FolderPickerModalProps) {
  const [browse, setBrowse] = useState<BrowseResponse | null>(null);
  const [jumpPath, setJumpPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roots, setRoots] = useState<Array<{ name: string; path: string }>>([]);

  const load = useCallback(async (path?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await filesystemService.browse(path);
      setBrowse(result);
      setJumpPath(result.path);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to browse folders.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const start =
      initialPath && initialPath.trim().length > 0 ? initialPath.trim() : undefined;
    void load(start);
    void filesystemService
      .roots()
      .then((response) => setRoots(response.roots))
      .catch(() => setRoots([]));
  }, [open, initialPath, load]);

  function selectCurrent() {
    if (!browse?.path) {
      return;
    }
    onSelect(browse.path);
    onClose();
  }

  return (
    <Modal open={open} title="Choose repository folder" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Browse folders on the machine running the FastAPI backend. Select a
          repository directory, then click Use this folder.
        </p>

        {roots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {roots.map((root) => (
              <Button
                key={root.path}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void load(root.path)}
                disabled={isLoading}
              >
                {root.name === "Home" ? (
                  <Home className="size-3.5" aria-hidden />
                ) : (
                  <Folder className="size-3.5" aria-hidden />
                )}
                {root.name}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Current path"
              value={jumpPath}
              onChange={(event) => setJumpPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void load(jumpPath);
                }
              }}
              disabled={isLoading}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void load(jumpPath)}
            disabled={isLoading || !jumpPath.trim()}
          >
            Go
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => browse?.parent && void load(browse.parent)}
            disabled={isLoading || !browse?.parent}
          >
            <ArrowUp className="size-3.5" aria-hidden />
            Up
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void load(browse?.path ?? jumpPath)}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("size-3.5", isLoading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
          {browse ? (
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">
              {browse.path}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-zinc-950/50">
          {isLoading && !browse ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading folders…
            </div>
          ) : browse && browse.entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No subfolders here. You can still use this folder.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800/80" role="listbox" aria-label="Folders">
              {(browse?.entries ?? []).map((entry) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    onClick={() => void load(entry.path)}
                    onDoubleClick={() => {
                      onSelect(entry.path);
                      onClose();
                    }}
                  >
                    <FolderOpen className="size-4 shrink-0 text-amber-300" aria-hidden />
                    <span className="min-w-0 truncate">{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={selectCurrent}
            disabled={!browse?.path || isLoading}
          >
            <Check className="size-4" aria-hidden />
            Use this folder
          </Button>
        </div>
      </div>
    </Modal>
  );
}

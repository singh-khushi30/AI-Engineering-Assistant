import { http } from "@/lib/http";

export type DirectoryEntry = {
  name: string;
  path: string;
  is_dir: boolean;
};

export type BrowseResponse = {
  path: string;
  parent: string | null;
  home: string;
  entries: DirectoryEntry[];
  error?: string | null;
};

export type FilesystemRootsResponse = {
  home: string;
  roots: Array<{ name: string; path: string }>;
};

export const filesystemService = {
  browse(path?: string | null, signal?: AbortSignal): Promise<BrowseResponse> {
    const query =
      path && path.trim()
        ? `?path=${encodeURIComponent(path.trim())}`
        : "";
    return http<BrowseResponse>(`/filesystem/browse${query}`, { signal });
  },

  roots(signal?: AbortSignal): Promise<FilesystemRootsResponse> {
    return http<FilesystemRootsResponse>("/filesystem/home", { signal });
  },
};

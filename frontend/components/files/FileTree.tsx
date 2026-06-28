"use client";
import { useState, useMemo } from "react";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  Settings,
} from "lucide-react";

interface FileTreeProps {
  files: string[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of paths) {
    const parts = path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isDir = i < parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      let existing = current.find((n) => n.name === name && n.isDir === isDir);
      if (!existing) {
        existing = { name, path: fullPath, isDir, children: [] };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  // Sort: directories first, then alphabetically
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  }
  sortNodes(root);
  return root;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "py", "rb", "go", "rs"].includes(ext))
    return <FileCode className="w-3.5 h-3.5 text-brand-400" />;
  if (["json", "yaml", "yml", "toml"].includes(ext))
    return <FileJson className="w-3.5 h-3.5 text-yellow-500" />;
  if (["md", "txt", "rst"].includes(ext))
    return <FileText className="w-3.5 h-3.5 text-gray-400" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext))
    return <FileImage className="w-3.5 h-3.5 text-green-400" />;
  if (["env", "gitignore", "dockerignore", "eslintrc"].includes(ext) || name.startsWith("."))
    return <Settings className="w-3.5 h-3.5 text-gray-500" />;
  return <File className="w-3.5 h-3.5 text-gray-400" />;
}

export default function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <Folder className="w-8 h-8 text-surface-500 mx-auto mb-2" />
        <p className="text-xs text-gray-600">No files yet</p>
        <p className="text-[10px] text-gray-700 mt-1">Send a prompt to generate code</p>
      </div>
    );
  }

  return (
    <div className="py-1 stagger-children">
      {tree.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  selectedFile,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full text-left flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-surface-300/50 rounded transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-brand-400" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedFile === node.path;
  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
        isSelected
          ? "bg-brand-900/40 text-brand-200 border-l-2 border-brand-500"
          : "text-gray-400 hover:text-white hover:bg-surface-300/50"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

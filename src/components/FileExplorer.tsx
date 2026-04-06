import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import type { FileEntry } from '../types';
import { listProjectFiles } from '../lib/tauri';

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(entries: FileEntry[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const entry of entries) {
    const node: TreeNode = { name: entry.path.split('/').pop() ?? entry.path, path: entry.path, isDir: entry.isDir, children: [] };
    map.set(entry.path, node);
    const parentPath = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '';
    if (parentPath === '') {
      roots.push(node);
    } else {
      map.get(parentPath)?.children.push(node);
    }
  }

  return roots;
}

interface NodeProps {
  node: TreeNode;
  depth: number;
  onOpenFile: (relativePath: string) => void;
}

function TreeNodeItem({ node, depth, onOpenFile }: NodeProps) {
  const [open, setOpen] = useState(depth === 0);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
          className="w-full text-left py-0.5 text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 truncate"
        >
          <span className="shrink-0">{open ? '▾' : '▸'}</span>
          <span className="truncate">{node.name}/</span>
        </button>
        {open && node.children.map((child) => (
          <TreeNodeItem key={child.path} node={child} depth={depth + 1} onOpenFile={onOpenFile} />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpenFile(node.path)}
      style={{ paddingLeft: `${1.5 + depth * 0.75}rem` }}
      className="w-full text-left py-0.5 pr-3 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700/50 truncate"
    >
      {node.name}
    </button>
  );
}

interface Props {
  onOpenFile: (relativePath: string) => void;
}

export default function FileExplorer({ onOpenFile }: Props) {
  const { project } = useProject();
  const [tree, setTree] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!project) return;
    listProjectFiles(project.rootPath)
      .then((entries) => setTree(buildTree(entries)))
      .catch(console.error);
  }, [project]);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pt-2">
      {tree.map((node) => (
        <TreeNodeItem key={node.path} node={node} depth={0} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}

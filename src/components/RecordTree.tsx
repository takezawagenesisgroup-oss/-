import Link from 'next/link';

export type RecordNode = {
  id: number;
  title: string;
  description: string | null;
  workDate: string;
  durationMinutes: number | null;
  troubleName: string | null;
  troubleIcon: string | null;
  assigneeName: string | null;
  photoCount: number;
  children: RecordNode[];
};

function Node({ node, depth }: { node: RecordNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth > 0 ? '1.75rem' : 0 }} className="mb-3">
      <Link href={`/records/${node.id}`} className="card flex gap-3 p-4 items-start hover:border-brand-400">
        <span className="text-3xl">{node.troubleIcon || '📋'}</span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-lg">{node.title}</span>
            {node.troubleName && (
              <span className="tag-pill bg-brand-100 text-brand-800 text-sm">{node.troubleName}</span>
            )}
          </div>
          <div className="text-base text-gray-500 mt-1 flex flex-wrap gap-x-4">
            <span>📅 {node.workDate}</span>
            {node.assigneeName && <span>👤 {node.assigneeName}</span>}
            {node.durationMinutes != null && <span>⏱ 約{node.durationMinutes}分</span>}
            {node.photoCount > 0 && <span>📷 {node.photoCount}枚</span>}
          </div>
          {node.description && (
            <p className="text-base text-gray-700 mt-1 line-clamp-2">{node.description}</p>
          )}
        </div>
      </Link>
      {node.children.length > 0 && (
        <div className="border-l-4 border-brand-100 pl-1 mt-2">
          {node.children.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecordTree({ nodes }: { nodes: RecordNode[] }) {
  return (
    <div>
      {nodes.map((n) => (
        <Node key={n.id} node={n} depth={0} />
      ))}
    </div>
  );
}

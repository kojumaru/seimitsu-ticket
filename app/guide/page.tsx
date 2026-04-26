import Link from "next/link";

const GUIDES = [
  {
    name: "PROJECT",
    description: "プロジェクト",
    path: "/guide/project",
    color: "bg-blue-500",
  },
  {
    name: "142",
    description: "14号館 2階",
    path: "/guide/142",
    color: "bg-green-500",
  },
  {
    name: "146",
    description: "14号館 6階",
    path: "/guide/146",
    color: "bg-purple-500",
  },
];

export default function GuidePage() {
  return (
    <main
      className="min-h-screen bg-[#A64C60] flex flex-col items-center justify-center p-8"
      style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
      `}</style>

      <div className="w-full max-w-2xl">
        <h1
          className="text-5xl font-black text-white mb-8 text-center"
          style={{ letterSpacing: "0.05em" }}
        >
          ガイド一覧
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {GUIDES.map((guide) => (
            <Link
              key={guide.name}
              href={guide.path}
              className="block"
            >
              <div
                className={`${guide.color} p-8 rounded-2xl text-white text-center hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col items-center justify-center`}
                style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))" }}
              >
                <div className="text-4xl font-black mb-2">{guide.name}</div>
                <div className="text-lg font-bold">{guide.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

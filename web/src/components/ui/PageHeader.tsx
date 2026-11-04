export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-1 text-text-secondary">{subtitle}</p>
    </div>
  );
}

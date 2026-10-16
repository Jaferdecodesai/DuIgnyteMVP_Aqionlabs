import Link from "next/link";
export default function NotFound() {
  return (
    <div className="startup">
      <span className="eyebrow">AQION RELAY</span>
      <h1>This page isn’t in your workspace.</h1>
      <p>
        Return to the workbench to continue exploring your recovery options.
      </p>
      <Link className="button primary" href="/">
        Back to workspace
      </Link>
    </div>
  );
}

"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="startup">
      <h1>Let’s get your workspace back.</h1>
      <p role="alert">
        The page could not be displayed. Your saved server records are
        unaffected.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

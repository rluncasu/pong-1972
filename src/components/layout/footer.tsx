export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-4 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Face Darts. All rights reserved.
        </p>
      </div>
    </footer>
  );
} 
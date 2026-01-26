import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const DownloadAppSection = () => {
  return (
    <section className="py-12">
      <div className="container px-4">
        <div className="rounded-2xl border border-border/50 bg-card p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Content */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold md:text-2xl">
                  Get the Timeless App
                </h3>
                <p className="text-muted-foreground mt-1">
                  Create anywhere with our mobile app
                </p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a
                  href="https://apps.apple.com/us/app/timeless-all-in-one-ai/id6740804440"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  App Store
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.wolfine.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.56.69.56 1.19s-.22.92-.56 1.19l-2.11 1.24-2.5-2.5 2.5-2.5 2.11 1.38zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                  </svg>
                  Google Play
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadAppSection;

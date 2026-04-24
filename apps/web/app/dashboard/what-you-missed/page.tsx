import { AppHeader } from "../../../components/app-header";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";

export default function WhatYouMissedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>7.3 What You Missed Feature</CardTitle>
            <CardDescription>Module scaffold is ready. Feature implementation continues in next steps.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}

"use client"

import { usePGlite } from "@electric-sql/pglite-react"

import { DataManagement } from "@/components/data-management"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SettingsPage() {
  // `usePGlite()` returns the live-enabled handle (our `AppPGlite`).
  const pg = usePGlite()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your on-device data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data &amp; backups</CardTitle>
          <CardDescription>
            Your books are stored only on this device. Back them up before app updates
            or when moving to another device, and restore on the other end.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataManagement pg={pg} />
        </CardContent>
      </Card>
    </div>
  )
}

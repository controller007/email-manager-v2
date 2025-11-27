
import { requireAuth } from "@/app/_lib/auth/session"
import DashboardLayout from "@/app/_components/dashboard-layout"

import { Globe, Plus } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card"
import { Button } from "@/app/_components/ui/button"
import { getAllDomains } from "./actions"
import { AddDomainDialog } from "../_components/domain-dialgue"
import { DomainList } from "../_components/domain-list"

export default async function DomainsPage() {
  const user = await requireAuth()
  const { domains } = await getAllDomains()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Domain Management</h1>
            <p className="text-gray-600 mt-1">
              Set up and verify domains for sending emails
            </p>
          </div>
          <AddDomainDialog />
        </div>

        {/* Domain List or Empty State */}
        {domains && domains.length > 0 ? (
          <DomainList domains={domains} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Domains Yet</CardTitle>
              <CardDescription>
                Add your first domain to start sending emails from your own domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Globe className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Get started with your domain
                </h3>
                <p className="mt-2 text-gray-500">
                  Add a domain you own to send professional emails with your brand
                </p>
                <div className="mt-6">
                  <AddDomainDialog />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900">1. Add Your Domain</h4>
              <p>Enter the domain you want to use for sending emails</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">2. Configure DNS Records</h4>
              <p>Add the provided DNS records to your domain provider (Hostinger)</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">3. Verify Domain</h4>
              <p>Click verify once DNS records are added (may take up to 48 hours)</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">4. Create Senders</h4>
              <p>Add sender emails like info@yourdomain.com to use in campaigns</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
// app/contact-lists/page.tsx
import { requireAuth } from "@/app/_lib/auth/session"
import DashboardLayout from "@/app/_components/dashboard-layout"
import { ContactListsGrid } from "@/app/_components/contact-lists-grid"
import { CreateContactListDialog } from "@/app/_components/create-contact-list-dialog"
import { Button } from "@/app/_components/ui/button"
import { Card, CardContent } from "@/app/_components/ui/card"
import prisma from "@/app/_lib/db/prisma"
import { Users, Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/app/_components/ui/alert"

async function getContactLists(userId: string) {
  const contactLists = await prisma.contactList.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { emailHistory: true },
      },
      domain: {
        include: {
          senders: true,
        },
      },
    },
  })

  return contactLists
}

async function getVerifiedDomains(userId: string) {
  const domains = await prisma.domain.findMany({
    where: {
      userId,
      status: "verified",
    },
    include: {
      senders: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return domains
}

export default async function ContactListsPage() {
  const user = await requireAuth()
  const [contactLists, verifiedDomains] = await Promise.all([
    getContactLists(user.id),
    getVerifiedDomains(user.id),
  ])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contact Lists</h1>
            <p className="text-gray-600 mt-1">
              Manage your email recipient lists and send targeted campaigns
            </p>
          </div>
          <CreateContactListDialog verifiedDomains={verifiedDomains}>
            <Button disabled={verifiedDomains.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </Button>
          </CreateContactListDialog>
        </div>

        {/* No Verified Domains Warning */}
        {verifiedDomains.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Verified Domains</AlertTitle>
            <AlertDescription>
              You need to add and verify a domain before creating contact lists.
              <Link href="/domains" className="ml-2 text-blue-600 hover:underline font-medium">
                Go to Domains →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {contactLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Lists</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contactLists.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Contacts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contactLists.reduce((sum, list) => sum + list.emails.length, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg. List Size</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(
                        contactLists.reduce((sum, list) => sum + list.emails.length, 0) /
                          contactLists.length
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contact Lists Grid */}
        <ContactListsGrid contactLists={contactLists} />

        {/* Empty State */}
        {contactLists.length === 0 && verifiedDomains.length > 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No contact lists yet
              </h3>
              <p className="mt-2 text-gray-500">
                Get started by creating your first contact list to begin sending campaigns.
              </p>
              <div className="mt-6">
                <CreateContactListDialog verifiedDomains={verifiedDomains}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First List
                  </Button>
                </CreateContactListDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
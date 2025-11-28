"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card"
import { Button } from "@/app/_components/ui/button"
import { Badge } from "@/app/_components/ui/badge"
import { EditContactListDialog } from "./edit-contact-list-dialog"
import { DeleteContactListDialog } from "./delete-contact-list-dialog"
import { Users, Mail, Edit, Trash2, Calendar, Globe, Send, CheckCircle2 } from "lucide-react"
import type { ContactList, Domain, Sender } from "@prisma/client"
import Link from "next/link"

interface ContactListWithRelations extends ContactList {
  _count: {
    emailHistory: number
  }
  domain: Domain & {
    senders: Sender[]
  }
}

interface ContactListsGridProps {
  contactLists: ContactListWithRelations[]
}

export function ContactListsGrid({ contactLists }: ContactListsGridProps) {
  if (contactLists.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No contact lists found
          </h3>
          <p className="mt-2 text-gray-500">
            Get started by creating your first contact list. You'll need a verified domain first.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contactLists.map((list) => (
        <Card key={list.id} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-gray-900 truncate mb-2">
                  {list.name}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-600 font-medium truncate">
                    {list.domain.domain}
                  </span>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <EditContactListDialog contactList={list}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                </EditContactListDialog>
                <DeleteContactListDialog contactList={list}>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DeleteContactListDialog>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-700">
                    {list.emails.length}
                  </span>
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  Contact{list.emails.length !== 1 ? "s" : ""}
                </div>
              </div>
              
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Mail className="h-4 w-4 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-700">
                    {list._count.emailHistory}
                  </span>
                </div>
                <div className="text-xs text-purple-600 font-medium">
                  Campaign{list._count.emailHistory !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Senders Info */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Available Senders
                </span>
              </div>
              {list.domain.senders.length > 0 ? (
                <div className="space-y-1">
                  {list.domain.senders.slice(0, 2).map((sender) => (
                    <div key={sender.id} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {sender.name}
                      </Badge>
                      <span className="text-xs text-gray-500 truncate">
                        {sender.email}
                      </span>
                    </div>
                  ))}
                  {list.domain.senders.length > 2 && (
                    <p className="text-xs text-gray-500 mt-1">
                      +{list.domain.senders.length - 2} more sender{list.domain.senders.length - 2 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No senders configured</p>
              )}
            </div>

            {/* Email Preview */}
            {list.emails.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-2">Sample Contacts:</p>
                <div className="space-y-1">
                  {list.emails.slice(0, 3).map((email, index) => (
                    <p key={index} className="text-xs text-green-800 truncate font-mono">
                      {email}
                    </p>
                  ))}
                  {list.emails.length > 3 && (
                    <p className="text-xs text-green-600 font-medium">
                      +{list.emails.length - 3} more contact{list.emails.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                Created {new Date(list.createdAt).toLocaleDateString("en-US", { 
                  year: "numeric", 
                  month: "short", 
                  day: "numeric" 
                })}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button asChild className="flex-1" size="sm">
                <Link href={`/send-email?listId=${list.id}`}>
                  <Send className="h-4 w-4 mr-1" />
                  Send Email
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
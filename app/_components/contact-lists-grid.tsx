"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/_components/ui/alert-dialog";
import { Input } from "@/app/_components/ui/input";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { EditContactListDialog } from "./edit-contact-list-dialog";
import { DeleteContactListDialog } from "./delete-contact-list-dialog";
import {
  Users,
  Mail,
  Edit,
  Trash2,
  Calendar,
  Globe,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ContactList, Domain, Sender } from "@prisma/client";
import Link from "next/link";

interface ContactListWithRelations extends ContactList {
  _count: {
    emailHistory: number;
  };
  domain: Domain & {
    senders: Sender[];
  };
}

interface ContactListsGridProps {
  contactLists: ContactListWithRelations[];
}

const ITEMS_PER_PAGE = 9;

export function ContactListsGrid({ contactLists }: ContactListsGridProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique domains for filter
  const uniqueDomains = Array.from(
    new Set(contactLists.map((list) => list.domain?.domain).filter(Boolean))
  ) as string[];

  // Filter logic
  const filteredLists = contactLists.filter((list) => {
    const matchesSearch = list.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDomain =
      domainFilter === "all" || list.domain?.domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLists.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLists = filteredLists.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleDomainFilterChange = (value: string) => {
    if (value === "all") {
      localStorage.removeItem("domain");
    } else {
      localStorage.setItem("domain", value);
    }
    setDomainFilter(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("domain");
      if (data) {
        setDomainFilter(data);
      }
    }
  }, []);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLists.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLists.map((list) => list.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/contact-lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete contact lists");
      }

      setSelectedIds(new Set());
      setCurrentPage(1);
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to delete contact lists"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected =
    paginatedLists.length > 0 && selectedIds.size === paginatedLists.length;

  if (contactLists.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No contact lists found
          </h3>
          <p className="mt-2 text-gray-500">
            Get started by creating your first contact list. You'll need a
            verified domain first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search contact lists..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Domain Filter */}
        {uniqueDomains.length > 0 && (
          <Select key={domainFilter} value={domainFilter} onValueChange={handleDomainFilterChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {uniqueDomains.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Select All */}
      {paginatedLists.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <label
            htmlFor="select-all"
            className="text-sm text-gray-600 cursor-pointer select-none"
          >
            Select all on this page ({paginatedLists.length})
          </label>
        </div>
      )}

      {/* Contact Lists Grid */}
      {paginatedLists.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedLists.map((list) => (
              <Card
                key={list.id}
                className={`hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 relative ${
                  selectedIds.has(list.id)
                    ? "ring-2 ring-blue-500 border-blue-500"
                    : ""
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedIds.has(list.id)}
                    onCheckedChange={() => toggleSelection(list.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <CardHeader className="pb-3 pl-12">
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
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <EditContactListDialog contactList={list}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </EditContactListDialog>
                      <DeleteContactListDialog contactList={list}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
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
                          <div
                            key={sender.id}
                            className="flex items-center gap-2"
                          >
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
                            +{list.domain.senders.length - 2} more sender
                            {list.domain.senders.length - 2 !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No senders configured
                      </p>
                    )}
                  </div>

                  {/* Email Preview */}
                  {list.emails.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-medium text-green-700 mb-2">
                        Sample Contacts:
                      </p>
                      <div className="space-y-1">
                        {list.emails.slice(0, 3).map((email, index) => (
                          <p
                            key={index}
                            className="text-xs text-green-800 truncate font-mono"
                          >
                            {email}
                          </p>
                        ))}
                        {list.emails.length > 3 && (
                          <p className="text-xs text-green-600 font-medium">
                            +{list.emails.length - 3} more contact
                            {list.emails.length - 3 !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Created{" "}
                      {new Date(list.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-6">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredLists.length)} of{" "}
                {filteredLists.length} lists
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No contact lists found
            </h3>
            <p className="mt-2 text-gray-500">
              {searchQuery || domainFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first contact list to get started"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact Lists?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} contact list
              {selectedIds.size !== 1 ? "s" : ""}? This will also remove all
              associated contacts from Resend. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  Delete {selectedIds.size} List
                  {selectedIds.size !== 1 ? "s" : ""}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

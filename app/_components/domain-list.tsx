"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Loader,
} from "lucide-react";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";

import {
  deleteDomain,
  deleteSender,
  getDomainRecords,
  verifyDomain,
} from "../domains/actions";
import { DnsRecordsDisplay } from "./dns-record-display";
import { EditSenderDialog } from "./sender-dialogue";
import { AddSenderDialog } from "./add-sender";

interface Domain {
  id: string;
  domain: string;
  status: string;
  createdAt: Date;
  senders: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

interface DomainListProps {
  domains: Domain[];
}

export function DomainList({ domains }: DomainListProps) {
  return (
    <div className="grid gap-6">
      {domains.map((domain) => (
        <DomainCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

function DomainCard({ domain }: { domain: Domain }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    setIsVerifying(true);
    setMessage("");

    const result = await verifyDomain(domain.id);

    if (result.success) {
      setMessage(result.message || "");
      router.refresh();
    } else {
      setMessage(result.error || "Verification  failed");
    }

    setIsVerifying(false);
  };

  const handleViewRecords = async () => {
    if (showRecords) {
      setShowRecords(false);
      return;
    }

    const result = await getDomainRecords(domain.id);

    if (result.success && result.records) {
      setRecords(result.records);
      setShowRecords(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteDomain(domain.id);

    if (result.success) {
      router.refresh();
    }
    setIsDeleting(false);
  };

  const getStatusIcon = () => {
    switch (domain.status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (domain.status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-gray-600" />
            <div>
              <CardTitle className="text-xl">{domain.domain}</CardTitle>
              <CardDescription>
                Added {new Date(domain.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={isVerifying || domain.status === "verified"}
          >
            {isVerifying ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Domain
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={handleViewRecords}>
            <Eye className="mr-2 h-4 w-4" />
            {showRecords ? "Hide" : "View"} DNS Records
          </Button>

          {domain.status === "verified" && (
            <AddSenderDialog domainId={domain.id} domainName={domain.domain} />
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {domain.domain}? This will
                  also delete all associated senders. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Message */}
        {message && (
          <Alert
            className={
              message.includes("success") ? "border-green-200 bg-green-50" : ""
            }
          >
            <AlertDescription
              className={message.includes("success") ? "text-green-800" : ""}
            >
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* DNS Records */}
        {showRecords && records.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <DnsRecordsDisplay
              records={records}
              domain={domain.domain}
              domainId={domain.id}
              onClose={() => setShowRecords(false)}
            />
          </div>
        )}

        {/* Senders List */}
        {domain.senders.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">
              Sender Emails ({domain.senders.length})
            </h4>
            <div className="grid gap-2">
              {domain.senders.map((sender) => (
                <SenderCard
                  key={sender.id}
                  sender={sender}
                  domainName={domain.domain}
                />
              ))}
            </div>
          </div>
        )}

        {domain.status === "verified" && domain.senders.length === 0 && (
          <Alert>
            <AlertDescription>
              <strong>No senders yet.</strong> Add a sender email to start
              sending campaigns from this domain.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// SENDER CARD COMPONENT
// ==========================================

function SenderCard({
  sender,
  domainName,
}: {
  sender: { id: string; name: string; email: string };
  domainName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteSender = async () => {
    setIsDeleting(true);
    const result = await deleteSender(sender.id);

    if (result.success) {
      router.refresh();
    }
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <p className="font-medium text-sm text-gray-900">{sender.name}</p>
        <p className="text-xs text-gray-600">{sender.email}</p>
      </div>

      <div className="flex items-center gap-1">
        <EditSenderDialog sender={sender} domainName={domainName} />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Sender</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{sender.email}</strong>?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSender}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Sender"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

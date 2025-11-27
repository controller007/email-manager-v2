"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/app/_components/ui/button"
import { Alert, AlertDescription } from "@/app/_components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table"

interface DnsRecordsDisplayProps {
  records: any[]
  domain: string
  domainId: string
  onClose: () => void
}

export function DnsRecordsDisplay({ 
  records, 
  domain,
  domainId,
  onClose 
}: DnsRecordsDisplayProps) {
  const [copiedField, setCopiedField] = useState("")

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(""), 2000)
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          <strong>Next Steps:</strong>
          <ol className="mt-2 space-y-1 text-sm">
            <li>1. Log in to your Hostinger account</li>
            <li>2. Go to DNS/Name Servers management</li>
            <li>3. Add each record below exactly as shown</li>
            <li>4. DNS changes can take up to 48 hours to propagate</li>
            <li>5. Return here to verify your domain</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name/Host</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-sm">
                  {record.type}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">
                      {record.name || "@"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(record.name || "@", `name-${index}`)}
                    >
                      {copiedField === `name-${index}` ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[300px]">
                      {record.value}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(record.value, `value-${index}`)}
                    >
                      {copiedField === `value-${index}` ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {record.priority && (
                    <span className="text-xs text-gray-500">
                      Priority: {record.priority}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={() => window.open("https://hpanel.hostinger.com", "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Hostinger Panel
        </Button>
        <Button onClick={onClose}>
          Done - I'll verify later
        </Button>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Important:</strong> Don't close this page! You can always view these records again from the domains list after clicking "Done".
        </AlertDescription>
      </Alert>
    </div>
  )
}
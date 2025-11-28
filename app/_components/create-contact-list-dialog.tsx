"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/_components/ui/button"
import { Input } from "@/app/_components/ui/input"
import { Label } from "@/app/_components/ui/label"
import { Textarea } from "@/app/_components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { Alert, AlertDescription } from "@/app/_components/ui/alert"
import { Badge } from "@/app/_components/ui/badge"
import { contactListSchema } from "@/app/_lib/validations/email"
import { AlertCircle, X, Plus, CheckCircle, Clock, Globe } from "lucide-react"
import { Domain, Sender } from "@prisma/client"

interface CreateContactListDialogProps {
  children: React.ReactNode
  verifiedDomains: Array<Domain & { senders: Sender[] }>
}

interface EmailValidationResult {
  email: string
  isValid: boolean
  hasMxRecord: boolean
  isReachable: boolean
  error?: string
}

export function CreateContactListDialog({ 
  children, 
  verifiedDomains 
}: CreateContactListDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [domainId, setDomainId] = useState("")
  const [emailsInput, setEmailsInput] = useState("")
  const [validEmails, setValidEmails] = useState<string[]>([])
  const [invalidEmails, setInvalidEmails] = useState<string[]>([])
  const [emailValidationResults, setEmailValidationResults] = useState<EmailValidationResult[]>([])
  const [isValidatingEmails, setIsValidatingEmails] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const selectedDomain = verifiedDomains.find(d => d.id === domainId)

  const parseEmails = (input: string): string[] => {
    if (!input.trim()) return []
    const emails = input
      .split(/[,;\s\n\t]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .filter((email, index, arr) => arr.indexOf(email) === index)
    return emails
  }

  const isValidEmailFormat = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return emailRegex.test(email) && email.length <= 254
  }

  const validateEmailFormats = (input: string) => {
    if (!input.trim()) {
      setValidEmails([])
      setInvalidEmails([])
      setEmailValidationResults([])
      return
    }

    const emails = parseEmails(input)
    const valid: string[] = []
    const invalid: string[] = []

    emails.forEach((email) => {
      if (isValidEmailFormat(email)) {
        valid.push(email)
      } else {
        invalid.push(email)
      }
    })

    setValidEmails(valid)
    setInvalidEmails(invalid)
    setEmailValidationResults([])
  }

  const handleEmailsInputChange = (value: string) => {
    setEmailsInput(value)
    validateEmailFormats(value)
  }

  const removeInvalidEmail = (emailToRemove: string) => {
    setInvalidEmails((prev) => prev.filter((email) => email !== emailToRemove))
    const emails = parseEmails(emailsInput)
    const updatedEmails = emails.filter((email) => email !== emailToRemove)
    setEmailsInput(updatedEmails.join(", "))
  }

  const validateEmailsWithMX = async () => {
    if (validEmails.length === 0) return

    setIsValidatingEmails(true)
    setError("")

    try {
      const response = await fetch("/api/validate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: validEmails }),
      })

      if (!response.ok) {
        throw new Error("Failed to validate emails")
      }

      const results: EmailValidationResult[] = await response.json()
      setEmailValidationResults(results)

      const mxValidEmails = results
        .filter(result => result.isValid && result.hasMxRecord && result.isReachable)
        .map(result => result.email)
      
      const mxInvalidEmails = results
        .filter(result => !result.isValid || !result.hasMxRecord || !result.isReachable)
        .map(result => result.email)

      const remainingValidEmails = validEmails.filter(email => !mxInvalidEmails.includes(email))
      const newInvalidEmails = [...invalidEmails, ...mxInvalidEmails]

      setValidEmails(remainingValidEmails)
      setInvalidEmails(newInvalidEmails)

    } catch (error) {
      setError(`Email validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsValidatingEmails(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (invalidEmails.length > 0) {
      setError("Please remove or fix invalid email addresses before saving.")
      return
    }

    try {
      const validationResult = contactListSchema.safeParse({
        name: name.trim(),
        emails: validEmails,
        domainId: domainId,
      })

      if (!validationResult.success) {
        setError(validationResult.error.errors[0].message)
        return
      }

      setIsLoading(true)

      const response = await fetch("/api/contact-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResult.data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create contact list")
      }

      setOpen(false)
      setName("")
      setDomainId("")
      setEmailsInput("")
      setValidEmails([])
      setInvalidEmails([])
      setEmailValidationResults([])
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getEmailStatus = (email: string) => {
    const result = emailValidationResults.find(r => r.email === email)
    if (!result) return null

    if (result.isValid && result.hasMxRecord && result.isReachable) {
      return { status: "valid", icon: CheckCircle, color: "text-green-600" }
    } else if (result.isValid && result.hasMxRecord && !result.isReachable) {
      return { status: "warning", icon: AlertCircle, color: "text-yellow-600" }
    } else {
      return { status: "invalid", icon: X, color: "text-red-600" }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contact List</DialogTitle>
          <DialogDescription>
            Create a new contact list linked to a verified domain. The domain determines which sender emails you can use.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {verifiedDomains.length === 0 && (
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                <strong>No verified domains available.</strong> You need to add and verify a domain before creating contact lists.
              </AlertDescription>
            </Alert>
          )}

          {/* Domain Selection */}
          <div className="space-y-2">
            <Label htmlFor="domain">Select Domain *</Label>
            <Select value={domainId} onValueChange={setDomainId} disabled={isLoading || verifiedDomains.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a verified domain" />
              </SelectTrigger>
              <SelectContent>
                {verifiedDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>{domain.domain}</span>
                      <Badge variant="outline" className="text-xs">
                        {domain.senders.length} sender{domain.senders.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDomain && (
              <p className="text-sm text-gray-500">
                Contact list will use senders from <strong>{selectedDomain.domain}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">List Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Newsletter Subscribers, VIP Customers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails">Email Addresses *</Label>
            <Textarea
              id="emails"
              placeholder="Enter email addresses separated by commas, spaces, or new lines&#10;example@domain.com user@company.com&#10;another@email.com, test@site.com"
              value={emailsInput}
              onChange={(e) => handleEmailsInputChange(e.target.value)}
              rows={12}
              disabled={isLoading}
            />
            <div className="flex flex-col justify-between gap-2">
              <p className="text-sm text-gray-500">
                Separate emails with commas, spaces, or new lines. Maximum 100 emails per list.
              </p>
              {validEmails.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-blue-500 text-white hover:bg-blue-400 w-fit hover:text-white"
                  onClick={validateEmailsWithMX}
                  disabled={isValidatingEmails || isLoading}
                >
                  {isValidatingEmails ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Validate Domains
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Valid emails preview */}
          {validEmails.length > 0 && (
            <div className="space-y-2">
              <Label>Valid Emails ({validEmails.length})</Label>
              <div className="max-h-40 overflow-y-auto p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex flex-wrap gap-1">
                  {validEmails.slice(0, 15).map((email, index) => {
                    const status = getEmailStatus(email)
                    return (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs flex items-center gap-1"
                      >
                        {email}
                        {status && (
                          <status.icon className={`h-3 w-3 ${status.color}`} />
                        )}
                      </Badge>
                    )
                  })}
                  {validEmails.length > 15 && (
                    <Badge variant="secondary" className="text-xs">
                      +{validEmails.length - 15} more...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Invalid emails */}
          {invalidEmails.length > 0 && (
            <div className="space-y-2">
              <Label className="text-red-600">Invalid Emails ({invalidEmails.length})</Label>
              <div className="max-h-40 overflow-y-auto p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex flex-wrap gap-1">
                  {invalidEmails.map((email, index) => (
                    <Badge key={index} variant="destructive" className="text-xs flex items-center gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeInvalidEmail(email)}
                        className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-sm text-red-600">Please remove or fix these invalid email addresses.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || invalidEmails.length > 0 || validEmails.length === 0 || !domainId || verifiedDomains.length === 0}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create List
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Search, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { websiteApi } from '@/lib/api';
import { getStatusBadgeClass, getStatusLabel, getTypeBadgeClass, getTypeLabel } from '@/lib/constants';

interface MatchedWebsite {
  id: string;
  domain: string;
  status: string;
  types: string[];
}

interface CheckResult {
  total: number;
  matched: MatchedWebsite[];
  unmatchedDomains: string[];
}

interface CheckDomainsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMatchedFound: (matched: MatchedWebsite[]) => void;
}

export function CheckDomainsDialog({ open, onOpenChange, onMatchedFound }: CheckDomainsDialogProps) {
  const [domainsText, setDomainsText] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('matched');

  const checkMutation = useMutation({
    mutationFn: (domains: string[]) => websiteApi.checkDuplicates(domains),
    onSuccess: (data) => {
      setResult(data);
      setSelectedIds(new Set(data.matched.map((w) => w.id)));
      setActiveTab('matched');
    },
    onError: () => {
      toast.error('Failed to check domains');
    },
  });

  const parseDomains = useCallback((text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
  }, []);

  const handleCheck = useCallback(() => {
    const domains = parseDomains(domainsText);
    if (domains.length === 0) {
      toast.error('Please enter at least one domain');
      return;
    }
    if (domains.length > 5000) {
      toast.error('Maximum 5000 domains allowed');
      return;
    }
    checkMutation.mutate(domains);
  }, [domainsText, parseDomains, checkMutation]);

  const handleSelectMatched = useCallback(() => {
    if (!result || selectedIds.size === 0) return;
    const selected = result.matched.filter((w) => selectedIds.has(w.id));
    onMatchedFound(selected);
    toast.success(`Showing ${selected.length} matched websites on main table`);
    handleClose(false);
  }, [result, selectedIds, onMatchedFound]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!result) return;
    if (checked) {
      setSelectedIds(new Set(result.matched.map((w) => w.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [result]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleCopyUnmatched = useCallback(() => {
    if (!result || result.unmatchedDomains.length === 0) return;
    navigator.clipboard.writeText(result.unmatchedDomains.join('\n'));
    toast.success(`Copied ${result.unmatchedDomains.length} domains to clipboard`);
  }, [result]);

  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      setDomainsText('');
      setResult(null);
      setSelectedIds(new Set());
      setActiveTab('matched');
    }
    onOpenChange(open);
  }, [onOpenChange]);

  const isAllSelected = useMemo(() => {
    if (!result || result.matched.length === 0) return false;
    return result.matched.every((w) => selectedIds.has(w.id));
  }, [result, selectedIds]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Check Domains</DialogTitle>
          <DialogDescription>
            Compare your domain list against the system to find duplicates
          </DialogDescription>
        </DialogHeader>

        {/* Input area */}
        <div className="space-y-2">
          <Textarea
            placeholder="Paste domains here (one per line, comma, or semicolon separated)"
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
            rows={5}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {parseDomains(domainsText).length} domains entered
            </span>
            <Button
              onClick={handleCheck}
              disabled={checkMutation.isPending || parseDomains(domainsText).length === 0}
            >
              {checkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Check
            </Button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Summary */}
            <div className="flex items-center gap-4 py-2 text-sm">
              <span>Total: <strong>{result.total}</strong></span>
              <span className="text-green-600">
                Matched: <strong>{result.matched.length}</strong>
              </span>
              <span className="text-orange-600">
                Unmatched: <strong>{result.unmatchedDomains.length}</strong>
              </span>
              {selectedIds.size > 0 && (
                <Button size="sm" className="ml-auto" onClick={handleSelectMatched}>
                  Show {selectedIds.size} selected on table
                </Button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="w-fit">
                <TabsTrigger value="matched">
                  Matched ({result.matched.length})
                </TabsTrigger>
                <TabsTrigger value="unmatched">
                  Unmatched ({result.unmatchedDomains.length})
                </TabsTrigger>
              </TabsList>

              {/* Matched tab */}
              <TabsContent value="matched" className="flex flex-col flex-1 min-h-0 mt-2">
                {result.matched.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No matching domains found</p>
                ) : (
                  <div className="overflow-auto flex-1 border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="w-10 p-2">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="text-left p-2 font-medium">Domain</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Types</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.matched.map((website) => (
                          <tr
                            key={website.id}
                            className={`border-t hover:bg-muted/30 ${selectedIds.has(website.id) ? 'bg-blue-50' : ''}`}
                          >
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={selectedIds.has(website.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectOne(website.id, !!checked)
                                }
                              />
                            </td>
                            <td className="p-2 font-mono">{website.domain}</td>
                            <td className="p-2">
                              <Badge
                                variant="secondary"
                                className={getStatusBadgeClass(website.status)}
                              >
                                {getStatusLabel(website.status)}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1 flex-wrap">
                                {website.types.map((t) => (
                                  <Badge
                                    key={t}
                                    variant="secondary"
                                    className={`${getTypeBadgeClass(t)} text-xs px-1.5 py-0`}
                                  >
                                    {getTypeLabel(t)}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Unmatched tab */}
              <TabsContent value="unmatched" className="flex flex-col flex-1 min-h-0 mt-2">
                {result.unmatchedDomains.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">All domains exist in the system</p>
                ) : (
                  <>
                    <div className="flex items-center justify-end py-2">
                      <Button variant="outline" size="sm" onClick={handleCopyUnmatched}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy all ({result.unmatchedDomains.length})
                      </Button>
                    </div>
                    <div className="overflow-auto flex-1 border rounded-md p-3">
                      <div className="font-mono text-sm space-y-0.5">
                        {result.unmatchedDomains.map((domain) => (
                          <div key={domain} className="text-muted-foreground">
                            {domain}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

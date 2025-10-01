"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Info, ChevronLeft, ChevronRight } from "lucide-react"

export default function IndividualRegulatorCompareTab() {
  const [useSystematicNames, setUseSystematicNames] = useState(false)
  const [selectedRegulator, setSelectedRegulator] = useState<string>("")
  const [hasColumnChanges, setHasColumnChanges] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  return (
    <div className="flex gap-6 h-full">
      <aside
        className={`shrink-0 transition-all duration-300 ease-in-out ${isPanelCollapsed ? "w-12" : "w-80"} relative`}
      >
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-4 z-10 h-7 w-7 rounded-full bg-white shadow-md border-border hover:bg-secondary"
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        >
          {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className={`${isPanelCollapsed ? "hidden" : "block"} space-y-4`}>
          <Card className="shadow-sm border-border/60">
            <Accordion type="multiple" defaultValue={["general"]}>
              <AccordionItem value="general" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">General</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <Switch
                      id="systematic-names"
                      checked={useSystematicNames}
                      onCheckedChange={setUseSystematicNames}
                    />
                    <Label htmlFor="systematic-names" className="cursor-pointer text-sm font-medium leading-relaxed">
                      Use Systematic Gene Names
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regulator-select" className="text-sm font-semibold">
                      Select Regulator
                    </Label>
                    <Select value={selectedRegulator} onValueChange={setSelectedRegulator}>
                      <SelectTrigger id="regulator-select" className="h-10">
                        <SelectValue placeholder="Choose a regulator..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">No data loaded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="replicate-columns" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Replicate Table Columns</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2 space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">General QC Metrics</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox id="qc-1" />
                        <Label htmlFor="qc-1" className="cursor-pointer text-sm">
                          Binding Source
                        </Label>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox id="qc-2" />
                        <Label htmlFor="qc-2" className="cursor-pointer text-sm">
                          Replicate ID
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Calling Cards QC Metrics</p>
                    <p className="text-xs text-muted-foreground">Additional metrics will appear here</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="comparison-columns" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Comparison Summary Columns</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2 space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Comparison Metrics</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox id="metric-1" />
                        <Label htmlFor="metric-1" className="cursor-pointer text-sm">
                          Rank Response
                        </Label>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox id="metric-2" />
                        <Label htmlFor="metric-2" className="cursor-pointer text-sm">
                          DTO P-value
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Database Identifier Columns</p>
                    <p className="text-xs text-muted-foreground">Additional identifiers will appear here</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <Button className="w-full h-10 font-medium" disabled={!hasColumnChanges}>
            Update Tables
          </Button>
        </div>

        {isPanelCollapsed && (
          <div className="flex items-center justify-center h-32 bg-card rounded-lg border border-border/60 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180">
              Filters
            </span>
          </div>
        )}
      </aside>

      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Individual Regulator Comparison</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              This page shows comparisons between binding locations and perturbation responses for individual TFs. Use
              the sidebar to type in the name of a TF or select it from a drop-down menu. Results are shown in the rank
              response plots and in summarized binding-perturbation comparisons, each of which is explained below.
            </p>
          </div>

          <Accordion type="single" collapsible className="border border-border/60 rounded-lg shadow-sm">
            <AccordionItem value="rank-response-description" className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <span className="text-sm font-semibold">Rank Response Plots Description</span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <strong className="text-foreground">Overview:</strong>
                  <br />
                  Each solid line on a rank response plot shows a comparison of one binding dataset to one perturbation
                  dataset. The genes are first ranked according to the strength of the perturbed TF&apos;s binding
                  signal in their regulatory DNA.
                </div>

                <div>
                  <strong className="text-foreground">Plot Axes:</strong>
                  <br />
                  The vertical axis shows the fraction of most strongly bound genes that are responsive to the
                  perturbation. Responsiveness is determined using a fixed threshold on the differential expression
                  p-value and/or log fold change. The horizontal axis indicates the number of most strongly bound genes
                  considered. For example, 20 on the horizontal axis indicates the 20 most strongly bound genes. There
                  is no fixed threshold on binding strength.
                </div>

                <div>
                  <strong className="text-foreground">Reference Lines:</strong>
                  <br />
                  The dashed horizontal line shows the random expectation – the fraction of all genes that are
                  responsive. For example, a dashed line at 0.1 means that 10% of all genes are responsive to
                  perturbation of this TF. The gray area shows a 95% confidence interval for the null hypothesis that
                  the bound genes are no more responsive than the random expectation.
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <AlertDescription className="text-sm leading-relaxed">
              <strong className="text-foreground">How to Use:</strong> Clicking on rows in the{" "}
              <strong>Replicate Selection Table</strong> controls which binding datasets are plotted. Tabs at the top
              show plots for different perturbation datasets. The sidebar allows control over which columns are
              displayed in this table.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-7 gap-6">
          <div className="col-span-4">
            <Card className="shadow-sm border-border/60 h-full">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="text-lg font-semibold">Rank Response Plots</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tfko">
                  <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50">
                    <TabsTrigger value="tfko" className="text-sm font-medium">
                      TFKO
                    </TabsTrigger>
                    <TabsTrigger value="overexpression" className="text-sm font-medium">
                      Overexpression
                    </TabsTrigger>
                    <TabsTrigger value="degron" className="text-sm font-medium">
                      Degron
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tfko" className="mt-4">
                    <div className="min-h-[500px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Select a regulator to view rank response plots</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="overexpression" className="mt-4">
                    <div className="min-h-[500px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Select a regulator to view rank response plots</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="degron" className="mt-4">
                    <div className="min-h-[500px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Select a regulator to view rank response plots</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-3">
            <Card className="shadow-sm border-border/60 flex flex-col h-full">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="text-lg font-semibold">Replicate Selection Table</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[500px]">
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Select a regulator to view replicates</p>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground border-t pt-4 leading-relaxed">
                <strong>How to use:</strong> Select rows in this table to filter and highlight corresponding data in the
                summarized binding-perturbation comparison table and plots. Multiple rows can be selected by holding
                Ctrl/Cmd while clicking.
              </CardFooter>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="border border-border/60 rounded-lg shadow-sm">
            <AccordionItem value="comparison-description" className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <span className="text-sm font-semibold">Summarized Binding-Perturbation Comparisons Description</span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <strong className="text-foreground">Overview:</strong>
                  <br />
                  Each row of this table shows summary statistics for comparisons of one binding dataset (or replicate)
                  to one perturbation-response dataset.
                </div>

                <div>
                  <strong className="text-foreground">Navigation:</strong>
                  <br />
                  The tabs at the top show tables for different perturbation datasets. The sidebar allows control over
                  which columns are displayed in this table.
                </div>

                <div>
                  <strong className="text-foreground">Analysis Methods:</strong>
                  <br />
                  The statistics are derived from three methods of comparison:
                </div>

                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Fraction responsive among the 25 or 50 most strongly bound genes;</li>
                  <li>A linear model fit to predict the response strength from the binding strength;</li>
                  <li>Dual Threshold Optimization.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Summarized Binding-Perturbation Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tfko">
                <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50">
                  <TabsTrigger value="tfko" className="text-sm font-medium">
                    TFKO
                  </TabsTrigger>
                  <TabsTrigger value="overexpression" className="text-sm font-medium">
                    Overexpression
                  </TabsTrigger>
                  <TabsTrigger value="degron" className="text-sm font-medium">
                    Degron
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tfko" className="mt-4">
                  <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">Select a regulator to view comparison data</p>
                  </div>
                </TabsContent>

                <TabsContent value="overexpression" className="mt-4">
                  <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">Select a regulator to view comparison data</p>
                  </div>
                </TabsContent>

                <TabsContent value="degron" className="mt-4">
                  <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">Select a regulator to view comparison data</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4 leading-relaxed">
              <strong>Note:</strong> Rows corresponding to your replicate selection table selection are automatically
              highlighted in aqua. This table shows detailed metrics for the selected expression source. Switch between
              tabs to view different expression conditions.
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

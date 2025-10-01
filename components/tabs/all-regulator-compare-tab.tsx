"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const BINDING_SOURCES = {
  chipexo: "ChIP-exo",
  chipchip: "ChIP-chip",
  callingcards: "Calling Cards",
}

const PERTURBATION_SOURCES = {
  mcisaac_oe: "Overexpression",
  kemmeren_tfko: "2014 TFKO",
  reimand_tfko: "2007 TFKO",
}

export default function AllRegulatorCompareTab() {
  const [onlySharedRegulators, setOnlySharedRegulators] = useState(true)
  const [selectedBindingSources, setSelectedBindingSources] = useState<string[]>([])
  const [selectedPerturbationSources, setSelectedPerturbationSources] = useState<string[]>([])
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  return (
    <div className="flex gap-6 h-full">
      <aside
        className={`shrink-0 transition-all duration-300 ease-in-out ${
          isPanelCollapsed ? "w-12" : "w-[360px]"
        } relative`}
      >
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-4 z-10 h-7 w-7 rounded-full bg-white shadow-md border-border hover:bg-secondary"
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        >
          {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className={`${isPanelCollapsed ? "hidden" : "block"}`}>
          <Card className="shadow-sm border-border/60">
            <Accordion type="multiple" defaultValue={["general", "binding", "perturbation"]}>
              <AccordionItem value="general" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">General</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <Switch
                      id="shared-regulators"
                      checked={onlySharedRegulators}
                      onCheckedChange={setOnlySharedRegulators}
                    />
                    <Label htmlFor="shared-regulators" className="cursor-pointer text-sm font-medium leading-relaxed">
                      Only Show Shared Regulators
                    </Label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="binding" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Binding Data Sources</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2">
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">Select binding sources:</p>
                  <div className="space-y-2">
                    {Object.entries(BINDING_SOURCES).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`binding-${key}`}
                          checked={selectedBindingSources.includes(key)}
                          onCheckedChange={(checked) => {
                            setSelectedBindingSources((prev) =>
                              checked ? [...prev, key] : prev.filter((s) => s !== key),
                            )
                          }}
                        />
                        <Label htmlFor={`binding-${key}`} className="text-sm cursor-pointer font-medium">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="perturbation" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Perturbation Response Sources</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2">
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">Select perturbation sources:</p>
                  <div className="space-y-2">
                    {Object.entries(PERTURBATION_SOURCES).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`perturbation-${key}`}
                          checked={selectedPerturbationSources.includes(key)}
                          onCheckedChange={(checked) => {
                            setSelectedPerturbationSources((prev) =>
                              checked ? [...prev, key] : prev.filter((s) => s !== key),
                            )
                          }}
                        />
                        <Label htmlFor={`perturbation-${key}`} className="text-sm cursor-pointer font-medium">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
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
            <h2 className="text-2xl font-semibold text-foreground mb-3">All Regulator Comparison</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              This page displays distribution plots for Rank Response, Dual Threshold Optimization (DTO) empirical
              p-value, and Univariate p-value. Use the sidebar to select binding and perturbation response data sources,
              and optionally restrict the view to regulators shared across all selected datasets.
            </p>
          </div>

          <ul className="space-y-4 text-sm">
            <li className="leading-relaxed">
              <strong className="text-foreground font-semibold">Rank Response:</strong>
              <span className="text-muted-foreground ml-1">
                Target genes are ranked by binding strength, and perturbation response is binarized into
                response/non-response. The distribution shows the proportion of genes labeled as responsive among the
                top 25 most strongly bound.
              </span>
            </li>
            <li className="leading-relaxed">
              <strong className="text-foreground font-semibold">DTO empirical p-value:</strong>
              <span className="text-muted-foreground ml-1">
                DTO compares two ranked lists—typically binding and response—to find thresholds that minimize the
                hypergeometric p-value of their overlap. The empirical p-value reflects the rank overlap&apos;s
                extremity relative to a null distribution generated via permutation. See the original method described
                in{" "}
                <a
                  href="https://genome.cshlp.org/content/30/3/459"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium underline-offset-2"
                >
                  Kang et al., 2020
                </a>
                .
              </span>
            </li>
            <li className="leading-relaxed">
              <strong className="text-foreground font-semibold">Univariate p-value:</strong>
              <span className="text-muted-foreground ml-1">
                The p-value from an ordinary least squares (OLS) regression model that predicts perturbation response
                based on the binding score of a regulator.
              </span>
            </li>
          </ul>
        </div>

        <Tabs defaultValue="rank-response" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
            <TabsTrigger value="rank-response" className="text-sm font-medium">
              Rank Response
            </TabsTrigger>
            <TabsTrigger value="dto" className="text-sm font-medium">
              DTO
            </TabsTrigger>
            <TabsTrigger value="univariate" className="text-sm font-medium">
              Univariate P-value
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rank-response" className="mt-6">
            <Card className="shadow-sm border-border/60">
              <CardContent className="min-h-[500px] flex items-center justify-center pt-6">
                <div className="text-center text-muted-foreground space-y-2">
                  <p className="text-sm font-medium">Rank Response Distribution Plot</p>
                  <p className="text-xs">Plotly visualization will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dto" className="mt-6">
            <Card className="shadow-sm border-border/60">
              <CardContent className="min-h-[500px] flex items-center justify-center pt-6">
                <div className="text-center text-muted-foreground space-y-2">
                  <p className="text-sm font-medium">DTO Empirical P-value Distribution Plot</p>
                  <p className="text-xs">Plotly visualization will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="univariate" className="mt-6">
            <Card className="shadow-sm border-border/60">
              <CardContent className="min-h-[500px] flex items-center justify-center pt-6">
                <div className="text-center text-muted-foreground space-y-2">
                  <p className="text-sm font-medium">Univariate P-value Distribution Plot</p>
                  <p className="text-xs">Plotly visualization will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

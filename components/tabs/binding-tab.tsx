"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

const BINDING_SOURCES = {
  chipexo: "ChIP-exo (Pugh Lab)",
  chipchip: "ChIP-chip (Young Lab)",
  callingcards: "Calling Cards (Brent/Mitra Labs)",
}

export default function BindingTab() {
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  const handleSourceToggle = (source: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        return prev.filter((s) => s !== source)
      } else if (prev.length < 3) {
        return [...prev, source]
      }
      return prev
    })
  }

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

        <div className={`${isPanelCollapsed ? "hidden" : "block"}`}>
          <Card className="shadow-sm border-border/60">
            <Accordion type="single" collapsible defaultValue="sources">
              <AccordionItem value="sources" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 rounded-t-lg transition-colors">
                  <span className="font-semibold text-base">Source Selection</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">Select up to 3 binding sources:</p>
                    <div className="space-y-3">
                      {Object.entries(BINDING_SOURCES).map(([key, label]) => (
                        <div
                          key={key}
                          className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <Checkbox
                            id={key}
                            checked={selectedSources.includes(key)}
                            onCheckedChange={() => handleSourceToggle(key)}
                            disabled={!selectedSources.includes(key) && selectedSources.length >= 3}
                            className="mt-0.5"
                          />
                          <Label htmlFor={key} className="text-sm cursor-pointer leading-relaxed font-medium">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
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
            <h2 className="text-2xl font-semibold text-foreground mb-3">Binding Data Overview</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              Explore TF binding datasets from multiple experimental sources. Each technique provides genome-wide
              measurements with different resolution and noise profiles.
            </p>
          </div>

          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <AlertDescription className="space-y-4 text-sm">
              <div className="space-y-4">
                <div>
                  <strong className="text-foreground font-semibold">ChIP-chip (Young Lab):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    Chromatin immunoprecipitation followed by microarray hybridization. Available at{" "}
                    <a
                      href="https://younglab.wi.mit.edu/regulatory_code/GWLD.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium underline-offset-2"
                    >
                      The Young Lab
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <strong className="text-foreground font-semibold">ChIP-exo (Pugh Lab):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    High-resolution footprints with base-pair precision via exonuclease digestion and sequencing.
                    Available at{" "}
                    <a
                      href="http://yeastepigenome.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium underline-offset-2"
                    >
                      yeastepigenome.org
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <strong className="text-foreground font-semibold">Calling Cards (Brent/Mitra Labs):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    In vivo transposon-based TF method enabling insertion events near TF binding sites.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Source Selection Summary</CardTitle>
              <CardDescription className="text-sm">Regulator counts and intersections</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[500px] flex items-center justify-center">
              {selectedSources.length === 0 ? (
                <div className="text-center space-y-4 p-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                    <Info className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">Select Sources to Begin</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Choose 1-3 binding sources from the sidebar to visualize regulator counts and dataset
                      intersections.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 w-full p-6">
                  <h4 className="font-semibold text-center text-lg">
                    {selectedSources.length === 1
                      ? "Single Source Selected"
                      : selectedSources.length === 2
                        ? "Two-Way Comparison"
                        : "Three-Way Comparison"}
                  </h4>
                  <div className="space-y-3">
                    {selectedSources.map((source) => (
                      <div key={source} className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                        <span className="text-sm font-medium">
                          {BINDING_SOURCES[source as keyof typeof BINDING_SOURCES]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-6 p-4 bg-muted/50 rounded-lg">
                    API integration required to display regulator counts and intersections
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Binding Correlation Matrix</CardTitle>
              <CardDescription className="text-sm">Interactive heatmap visualization</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[500px] flex items-center justify-center">
              <div className="w-full h-[450px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                <div className="text-center text-muted-foreground space-y-2">
                  <p className="text-sm font-medium">Correlation Matrix Placeholder</p>
                  <p className="text-xs">Plotly visualization will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

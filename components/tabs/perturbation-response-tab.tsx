"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

const PERTURBATION_SOURCES = {
  mcisaac_oe: "Overexpression (McIsaac Lab)",
  kemmeren_tfko: "2014 TFKO (Holstege Lab)",
  reimand_tfko: "2007 TFKO (Hu Lab)",
}

export default function PerturbationResponseTab() {
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Select perturbation response sources (0-3):
                    </p>
                    <div className="space-y-3">
                      {Object.entries(PERTURBATION_SOURCES).map(([key, label]) => (
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
            <h2 className="text-2xl font-semibold text-foreground mb-3">Perturbation Response Data</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              This page displays the source selection summary and correlation matrix for TF perturbation response
              datasets. The current datasets include data derived from gene deletions and overexpression methods.
            </p>
          </div>

          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <AlertDescription className="space-y-4 text-sm">
              <p className="leading-relaxed">
                Each dataset captures the effect on gene expression of perturbing a regulator. These experimental
                approaches differ in their perturbation strategy and noise profiles.
              </p>

              <ul className="space-y-4">
                <li>
                  <strong className="text-foreground font-semibold">Overexpression:</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    This data is from the McIsaac lab. The TF is overexpressed from a strong promoter via estradiol
                    induction of an artificial TF. Gene expression is measured via microarray at various time points. We
                    are currently displaying results for the 15 minute time point. The data is publicly available from:{" "}
                    <a
                      href="https://idea.research.calicolabs.com/data"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium underline-offset-2"
                    >
                      Calico labs
                    </a>
                    .
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">
                    Hackett, Sean R et al. &apos;Learning causal networks using inducible transcription factors and
                    transcriptome-wide time series.&apos; Molecular systems biology vol. 16,3 (2020): e9174.{" "}
                    <a
                      href="https://doi.org/10.15252/msb.20199174"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline underline-offset-2"
                    >
                      doi:10.15252/msb.20199174
                    </a>
                  </p>
                </li>

                <li>
                  <strong className="text-foreground font-semibold">2014 Transcription Factor Knock Out (TFKO):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    Deletion of a transcription factor&apos;s coding region. Gene expression is measured via microarray.
                    The data is publicly available from the{" "}
                    <a
                      href="https://idea.research.calicolabs.com/data"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium underline-offset-2"
                    >
                      Holstege Lab
                    </a>
                    .
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">
                    Kemmeren P, Sameith K, van de Pasch LA, Benschop JJ, Lenstra TL, Margaritis T, O&apos;Duibhir E,
                    Apweiler E, van Wageningen S, Ko CW, et al. 2014. Large-scale genetic perturbations reveal
                    regulatory networks and an abundance of gene-specific repressors. Cell 157: 740–752.{" "}
                    <a
                      href="https://doi.org/10.1016/j.cell.2014.02.054"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline underline-offset-2"
                    >
                      doi:10.1016/j.cell.2014.02.054
                    </a>
                  </p>
                </li>

                <li>
                  <strong className="text-foreground font-semibold">2007 TFKO:</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    This is also a deletion data set, with gene expression measured via microarray. This is a
                    re-analysis of data produced in the Hu lab. The data is provided in the Supplement of the following
                    paper:
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">
                    Reimand, Jüri et al. &apos;Comprehensive reanalysis of transcription factor knockout expression data
                    in Saccharomyces cerevisiae reveals many new targets.&apos; Nucleic acids research vol. 38,14
                    (2010): 4768-77.{" "}
                    <a
                      href="https://doi.org/10.1093/nar/gkq232"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline underline-offset-2"
                    >
                      doi:10.1093/nar/gkq232
                    </a>
                  </p>
                </li>
              </ul>

              <p className="leading-relaxed">
                More information on how this data was parsed and processed for the tfbindingandperturbation database can
                be found{" "}
                <a
                  href="https://github.com/cmatKhan/parsing_yeast_database_data"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium underline-offset-2"
                >
                  here
                </a>
                .
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Source Selection Summary</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[500px] flex items-center justify-center">
              {selectedSources.length === 0 ? (
                <div className="text-center space-y-4 p-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                    <Info className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">How to Use</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Select 1-3 perturbation response sources from the sidebar to see:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 mt-3">
                      <li>• Number of regulators in each selected source</li>
                      <li>• Intersections between sources (when 2+ selected)</li>
                      <li>• Three-way intersection (when 3 selected)</li>
                    </ul>
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
                          {PERTURBATION_SOURCES[source as keyof typeof PERTURBATION_SOURCES]}
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
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
              Select perturbation response sources from the sidebar to see regulator counts and intersections.
            </CardFooter>
          </Card>

          <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Correlation Matrix</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[500px] flex items-center justify-center">
              <div className="w-full h-[450px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                <div className="text-center text-muted-foreground space-y-2">
                  <p className="text-sm font-medium">Correlation Matrix Placeholder</p>
                  <p className="text-xs">Plotly visualization will appear here</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
              Click and drag to zoom in on a specific region of the correlation matrix. Double click to reset the zoom.
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

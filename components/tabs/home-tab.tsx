import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, BarChart3, GitCompare, Target } from "lucide-react"

export default function HomeTab() {
  return (
    <div className="h-full flex flex-col space-y-8 max-w-6xl">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
          Welcome to the TF Binding and Perturbation Explorer
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          An interactive platform for exploring transcription factor (TF) binding and gene expression responses
          following TF perturbation in yeast.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Binding Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              View TF binding profiles across multiple datasets including ChIP-exo, ChIP-chip, and Calling Cards.
              Compare datasets and analyze correlation matrices.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Perturbation Response</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Explore transcriptional responses to TF perturbations through gene deletion, overexpression, and
              degradation experiments across multiple datasets.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <GitCompare className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">All Regulator Compare</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analyze global statistics across many TFs by comparing binding datasets to perturbation response datasets
              with distribution plots and metrics.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Individual Regulator</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deep dive into individual TFs with detailed binding profiles, rank response plots, and comprehensive
              binding-perturbation comparisons.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select a tab above to begin exploring the data. Each section provides interactive visualizations and
            filtering options to help you analyze transcription factor binding and expression relationships.
          </p>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span>
            <span>Use the collapsible side panels to filter and customize your view of the data.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

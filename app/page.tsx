import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FlaskConical } from "lucide-react"
import HomeTab from "@/components/tabs/home-tab"
import BindingTab from "@/components/tabs/binding-tab"
import PerturbationResponseTab from "@/components/tabs/perturbation-response-tab"
import AllRegulatorCompareTab from "@/components/tabs/all-regulator-compare-tab"
import IndividualRegulatorCompareTab from "@/components/tabs/individual-regulator-compare-tab"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <FlaskConical className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                TF Binding & Perturbation Explorer
              </h1>
              <p className="text-xs text-muted-foreground">Transcription factor analysis platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b">
        <div className="container mx-auto px-8">
          <Tabs defaultValue="home" className="w-full">
            <TabsList className="h-12 bg-transparent border-0 rounded-none p-0 gap-1">
              <TabsTrigger
                value="home"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 h-12 font-medium"
              >
                Home
              </TabsTrigger>
              <TabsTrigger
                value="binding"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 h-12 font-medium"
              >
                Binding
              </TabsTrigger>
              <TabsTrigger
                value="perturbation"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 h-12 font-medium"
              >
                Perturbation Response
              </TabsTrigger>
              <TabsTrigger
                value="all-regulator"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 h-12 font-medium"
              >
                All Regulator Compare
              </TabsTrigger>
              <TabsTrigger
                value="individual"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 h-12 font-medium"
              >
                Individual Regulator
              </TabsTrigger>
            </TabsList>

            <div className="bg-background">
              <div className="container mx-auto px-8 py-8">
                <TabsContent value="home" className="mt-0">
                  <HomeTab />
                </TabsContent>

                <TabsContent value="binding" className="mt-0">
                  <BindingTab />
                </TabsContent>

                <TabsContent value="perturbation" className="mt-0">
                  <PerturbationResponseTab />
                </TabsContent>

                <TabsContent value="all-regulator" className="mt-0">
                  <AllRegulatorCompareTab />
                </TabsContent>

                <TabsContent value="individual" className="mt-0">
                  <IndividualRegulatorCompareTab />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </main>
  )
}

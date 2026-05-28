import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import Tools from "@/pages/Tools";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";
import MassDM from "@/pages/tools/MassDM";
import TokenChecker from "@/pages/tools/TokenChecker";
import Onliner from "@/pages/tools/Onliner";
import ServerJoiner from "@/pages/tools/ServerJoiner";
import Booster from "@/pages/tools/Booster";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/tools" component={Tools} />
        <Route path="/tools/mass-dm" component={MassDM} />
        <Route path="/tools/token-checker" component={TokenChecker} />
        <Route path="/tools/onliner" component={Onliner} />
        <Route path="/tools/server-joiner" component={ServerJoiner} />
        <Route path="/tools/booster" component={Booster} />
        <Route path="/admin" component={Admin} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

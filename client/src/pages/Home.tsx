import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Users, Zap, Shield, BarChart3, Gift } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Tipping Platform</h1>
          </div>
          <div className="flex gap-4">
            {isAuthenticated && user?.role === "admin" ? (
              <>
                <Button variant="outline" onClick={() => setLocation("/admin")}>
                  Admin Dashboard
                </Button>
                <Button variant="outline" onClick={() => setLocation("/onboard")}>
                  Onboard Worker
                </Button>
              </>
            ) : isAuthenticated ? (
              <Button variant="outline" onClick={() => setLocation("/onboard")}>
                Onboard Worker
              </Button>
            ) : (
              <Button onClick={() => (window.location.href = getLoginUrl())}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Digital Tipping Made Simple
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Enable your workers to receive tips directly through QR codes. Secure, fast, and transparent with automatic commission tracking.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setLocation("/onboard")}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Why Choose Our Platform?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <QrCode className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>QR Code Tipping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Customers scan a QR code to send tips instantly. No cash, no hassle.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Instant Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Tips are processed in real-time through Paystack with automatic splits.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>Secure & Safe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Bank-grade security with encrypted transactions and verified workers.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle>Easy Onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Simple form captures all needed info. Automatic Paystack sub-account setup.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-red-600 mb-2" />
                <CardTitle>Transparent Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track earnings, commissions, and transactions in real-time.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Gift className="h-8 w-8 text-pink-600 mb-2" />
                <CardTitle>Printable Cards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Download PDF tip cards with QR codes for physical display.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Onboard</h4>
            <p className="text-gray-600 text-sm">
              Workers register with their name, role, and bank details
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Get QR Code</h4>
            <p className="text-gray-600 text-sm">
              Receive a unique QR code and printable tip card
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Share & Scan</h4>
            <p className="text-gray-600 text-sm">
              Customers scan the QR code to send a tip
            </p>
          </div>

          <div className="text-center">
            <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">4</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Receive Payment</h4>
            <p className="text-gray-600 text-sm">
              Tips are processed instantly to your bank account
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-lg mb-8 text-blue-100">
            Onboard your first worker today and start receiving digital tips
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100"
            onClick={() => setLocation("/onboard")}
          >
            Onboard a Worker
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 Digital Tipping Platform. All rights reserved.</p>
          <p className="text-sm mt-2">Powered by Paystack | Secure payments for South Africa</p>
        </div>
      </footer>
    </div>
  );
}

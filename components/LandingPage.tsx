'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Bell, 
  Shield, 
  Zap, 
  Globe, 
  BarChart3,
  ArrowRight,
  Star,
  CheckCircle
} from 'lucide-react';
import { signIn } from 'next-auth/react';

const features = [
  {
    icon: TrendingUp,
    title: 'Real-time Price Tracking',
    description: 'Monitor cryptocurrency prices with live updates from CoinGecko API'
  },
  {
    icon: Bell,
    title: 'Smart Price Alerts',
    description: 'Set custom alerts and get notified via email when your target prices are reached'
  },
  {
    icon: BarChart3,
    title: 'Interactive Charts',
    description: 'Visualize price trends with beautiful, responsive charts and historical data'
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description: 'View prices in USD, EUR, INR, GBP, JPY and more currencies'
  },
  {
    icon: Shield,
    title: 'Secure Authentication',
    description: 'Sign in securely with Google OAuth and keep your alerts private'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built with Next.js 15 and optimized for speed and performance'
  }
];

const testimonials = [
  {
    name: 'Alex Chen',
    role: 'Crypto Trader',
    content: 'This app has revolutionized how I track my crypto investments. The alerts are incredibly reliable!',
    rating: 5
  },
  {
    name: 'Sarah Johnson',
    role: 'Investment Analyst',
    content: 'Clean interface, accurate data, and the multi-currency support is exactly what I needed.',
    rating: 5
  },
  {
    name: 'Mike Rodriguez',
    role: 'Portfolio Manager',
    content: 'The real-time charts and email notifications help me stay on top of market movements.',
    rating: 5
  }
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-2 bg-primary/10 rounded-full px-4 py-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Live Crypto Tracking</span>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              Track Crypto Prices
              <span className="block text-primary">Like a Pro</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Monitor real-time cryptocurrency prices, set intelligent alerts, and never miss 
              important market movements. Your complete crypto tracking solution.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => signIn('google')}
                className="text-lg px-8 py-6"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-6"
              >
                View Demo
              </Button>
            </div>
            
            <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Free forever
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Setup in 30 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to track crypto
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for both beginners and professional traders
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Cryptocurrencies</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Real-time Updates</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">5+</div>
              <div className="text-muted-foreground">Currencies Supported</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by crypto enthusiasts
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our users have to say about their experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">&ldquo;{testimonial.content}&rdquo;</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to start tracking?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users who trust our platform for their crypto tracking needs.
            </p>
            <Button 
              size="lg" 
              onClick={() => signIn('google')}
              className="text-lg px-8 py-6"
            >
              Start Tracking Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
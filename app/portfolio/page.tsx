"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Wallet,
  Target,
  Bell,
  AlertTriangle,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

interface PortfolioHolding {
  id: string;
  name: string;
  symbol: string;
  image: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
}

interface Alert {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  targetPrice: number;
  condition: "above" | "below";
  currency: string;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function PortfolioPage() {
  const { data: session, status } = useSession();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercentage, setTotalPnLPercentage] = useState(0);

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/alerts");
      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  // Delete alert
  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts?id=${alertId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setAlerts(alerts.filter((alert) => alert.id !== alertId));
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  // Mock portfolio data - in real app, this would come from your database
  useEffect(() => {
    if (session) {
      fetchAlerts(); // Fetch alerts when session is available

      // Start with empty holdings - user needs to add their own transactions
      const userHoldings: PortfolioHolding[] = [];

      setHoldings(userHoldings);

      // Calculate totals (will be 0 for empty portfolio)
      const total = userHoldings.reduce(
        (sum, holding) => sum + holding.value,
        0
      );
      const totalPnL = userHoldings.reduce(
        (sum, holding) => sum + holding.pnl,
        0
      );
      const totalCost = userHoldings.reduce(
        (sum, holding) => sum + holding.amount * holding.avgBuyPrice,
        0
      );

      setTotalValue(total);
      setTotalPnL(totalPnL);
      setTotalPnLPercentage(totalCost > 0 ? (totalPnL / totalCost) * 100 : 0);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/5">
      <Navbar currentPage="portfolio" />

      <main className="container mx-auto px-4 py-6">
        {/* Portfolio Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Portfolio</h1>
            <p className="text-muted-foreground">
              Track your cryptocurrency investments
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Value
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalValue, "USD")}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-0 shadow-lg bg-gradient-to-br",
              totalPnL >= 0
                ? "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
                : "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total P&L
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      totalPnL >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(totalPnL, "USD")}
                  </p>
                  <p
                    className={cn(
                      "text-sm",
                      totalPnL >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatPercentage(totalPnLPercentage)}
                  </p>
                </div>
                {totalPnL >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-600 opacity-80" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600 opacity-80" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Holdings</p>
                  <p className="text-2xl font-bold">{holdings.length}</p>
                  <p className="text-sm text-muted-foreground">Assets</p>
                </div>
                <PieChart className="w-8 h-8 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Best Performer
                  </p>
                  <p className="text-lg font-bold">-</p>
                  <p className="text-sm text-muted-foreground">No holdings</p>
                </div>
                <Target className="w-8 h-8 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Your Holdings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {holdings.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your portfolio by adding your first transaction
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Transaction
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">
                        Asset
                      </th>
                      <th className="text-right p-4 font-medium text-sm">
                        Holdings
                      </th>
                      <th className="text-right p-4 font-medium text-sm">
                        Avg Buy Price
                      </th>
                      <th className="text-right p-4 font-medium text-sm">
                        Current Price
                      </th>
                      <th className="text-right p-4 font-medium text-sm">
                        Market Value
                      </th>
                      <th className="text-right p-4 font-medium text-sm">
                        P&L
                      </th>
                      <th className="text-center p-4 font-medium text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => {
                      const isPositive = holding.pnl >= 0;

                      return (
                        <tr
                          key={holding.id}
                          className="border-b hover:bg-muted/20 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={holding.image}
                                alt={holding.name}
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <div className="font-semibold">
                                  {holding.name}
                                </div>
                                <div className="text-sm text-muted-foreground uppercase">
                                  {holding.symbol}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="font-medium">
                              {holding.amount.toLocaleString()} {holding.symbol}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="font-medium">
                              {formatCurrency(holding.avgBuyPrice, "USD")}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="font-medium">
                              {formatCurrency(holding.currentPrice, "USD")}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="font-semibold">
                              {formatCurrency(holding.value, "USD")}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div
                              className={cn(
                                "font-medium",
                                isPositive ? "text-green-600" : "text-red-600"
                              )}
                            >
                              <div className="flex items-center justify-end">
                                {isPositive ? (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                )}
                                {formatCurrency(holding.pnl, "USD")}
                              </div>
                              <div className="text-xs">
                                {formatPercentage(holding.pnlPercentage)}
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price Alerts Section */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Price Alerts
              </CardTitle>
              <Badge variant="secondary">
                {alerts.filter((alert) => alert.isActive).length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No alerts set</h3>
                <p className="text-muted-foreground mb-4">
                  Set price alerts to get notified when your favorite coins
                  reach target prices
                </p>
                <p className="text-sm text-muted-foreground">
                  Go to the Markets page and click "Set Alert&quot; on any coin
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">
                        Coin
                      </th>
                      <th className="text-right p-4 font-medium text-sm">
                        Target Price
                      </th>
                      <th className="text-center p-4 font-medium text-sm">
                        Condition
                      </th>
                      <th className="text-center p-4 font-medium text-sm">
                        Type
                      </th>
                      <th className="text-center p-4 font-medium text-sm">
                        Status
                      </th>
                      <th className="text-center p-4 font-medium text-sm">
                        Created
                      </th>
                      <th className="text-center p-4 font-medium text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        className="border-b hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-semibold">
                                {alert.coinName}
                              </div>
                              <div className="text-sm text-muted-foreground uppercase">
                                {alert.coinSymbol}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="font-medium">
                            {formatCurrency(
                              alert.targetPrice,
                              alert.currency.toUpperCase()
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <Badge
                            variant={
                              alert.condition === "above"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {alert.condition === "above" ? (
                              <>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Above
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Below
                              </>
                            )}
                          </Badge>
                        </td>

                        <td className="p-4 text-center">
                          <Badge
                            variant={alert.isRecurring ? "default" : "outline"}
                          >
                            {alert.isRecurring ? "Recurring" : "One-time"}
                          </Badge>
                        </td>

                        <td className="p-4 text-center">
                          <Badge
                            variant={alert.isActive ? "default" : "secondary"}
                          >
                            {alert.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </td>

                        <td className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlert(alert.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

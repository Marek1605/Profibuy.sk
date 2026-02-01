'use client';

import { useEffect, useState } from 'react';
import { Package, FolderTree, ShoppingCart, Truck, ArrowUp, ArrowDown } from 'lucide-react';

interface DashboardStats {
  total_products: number;
  total_categories: number;
  total_orders: number;
  total_suppliers: number;
  recent_orders: any[];
  product_change: number;
  order_change: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now
    setStats({
      total_products: 15420,
      total_categories: 256,
      total_orders: 1234,
      total_suppliers: 3,
      recent_orders: [],
      product_change: 12.5,
      order_change: 8.3,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const cards = [
    { 
      title: 'Produkty', 
      value: stats?.total_products.toLocaleString() || '0', 
      icon: Package,
      change: stats?.product_change,
      color: 'blue'
    },
    { 
      title: 'Kategórie', 
      value: stats?.total_categories.toLocaleString() || '0', 
      icon: FolderTree,
      color: 'green'
    },
    { 
      title: 'Objednávky', 
      value: stats?.total_orders.toLocaleString() || '0', 
      icon: ShoppingCart,
      change: stats?.order_change,
      color: 'purple'
    },
    { 
      title: 'Dodávatelia', 
      value: stats?.total_suppliers.toLocaleString() || '0', 
      icon: Truck,
      color: 'orange'
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <card.icon className="w-6 h-6" />
              </div>
              {card.change && (
                <div className={`flex items-center text-sm ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {Math.abs(card.change)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-gray-500 text-sm">{card.title}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4">Posledné aktivity</h2>
          <div className="text-gray-500 text-center py-8">
            Žiadne nedávne aktivity
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4">Rýchle akcie</h2>
          <div className="grid grid-cols-2 gap-4">
            <a href="/admin/suppliers" className="p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition">
              <Truck className="w-8 h-8 text-primary-600 mb-2" />
              <div className="font-medium">Dodávatelia</div>
              <div className="text-sm text-gray-500">Správa feedov</div>
            </a>
            <a href="/admin/products" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
              <Package className="w-8 h-8 text-blue-600 mb-2" />
              <div className="font-medium">Produkty</div>
              <div className="text-sm text-gray-500">Správa produktov</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

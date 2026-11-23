'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import type { Product } from '@/lib/types';
import { deleteProduct, saveProduct } from '@/lib/dataService';
import ProductFormModal from './ProductFormModal';

interface AdminProductsProps {
  products: Product[];
  onRefresh: () => void;
}

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'inactive';

export default function AdminProducts({ products, onRefresh }: AdminProductsProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Sync local products with props
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Inventory KPI calculations
  const totalStockUnits = useMemo(() => {
    return localProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  }, [localProducts]);

  const activeProductsCount = useMemo(() => {
    return localProducts.filter((p) => p.isActive).length;
  }, [localProducts]);

  const lowStockProductsCount = useMemo(() => {
    return localProducts.filter((p) => p.isActive && p.stock > 0 && p.stock <= 15).length;
  }, [localProducts]);

  const outOfStockProductsCount = useMemo(() => {
    return localProducts.filter((p) => p.stock === 0).length;
  }, [localProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    localProducts.forEach((p) => p.category && set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [localProducts]);

  // Filtered products list
  const filtered = useMemo(() => {
    return localProducts.filter((p) => {
      // Category filter
      const matchCat = selectedCat === 'All' || p.category.toLowerCase() === selectedCat.toLowerCase();

      // Search query
      const matchSearch =
        !search.trim() ||
        p.name_ar.toLowerCase().includes(search.toLowerCase()) ||
        p.name_en.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());

      // Stock status filter
      let matchStock = true;
      if (stockFilter === 'in_stock') {
        matchStock = p.isActive && p.stock > 15;
      } else if (stockFilter === 'low_stock') {
        matchStock = p.stock > 0 && p.stock <= 15;
      } else if (stockFilter === 'out_of_stock') {
        matchStock = p.stock === 0;
      } else if (stockFilter === 'inactive') {
        matchStock = !p.isActive;
      }

      return matchCat && matchSearch && matchStock;
    });
  }, [localProducts, selectedCat, search, stockFilter]);

  // Optimistic stock update
  const handleStockChange = async (productId: string, newStock: number) => {
    const sanitizedStock = Math.max(0, Math.floor(newStock));

    // 1. Optimistic local state update
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: sanitizedStock } : p))
    );
    setUpdatingId(productId);

    try {
      await saveProduct({ id: productId, stock: sanitizedStock });
      onRefresh();
    } catch (err) {
      console.error('Failed to update stock:', err);
      // Revert on error
      setLocalProducts(products);
    } finally {
      setUpdatingId(null);
    }
  };

  // Optimistic status toggle
  const handleToggleStatus = async (p: Product) => {
    const updatedStatus = !p.isActive;

    setLocalProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isActive: updatedStatus } : item))
    );
    setUpdatingId(p.id);

    try {
      await saveProduct({ id: p.id, isActive: updatedStatus });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setLocalProducts(products);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${name}" نهائياً من الكتالوج والمخزون؟`)) {
      setLocalProducts((prev) => prev.filter((p) => p.id !== id));
      await deleteProduct(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. INVENTORY SUMMARY KPIS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stock Units */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              إجمالي قطع المستودع
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-ink num-tabular">
                {totalStockUnits}
              </span>
              <span className="text-xs text-ink-muted">قطعة هودي</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center">
            <Package size={20} strokeWidth={1.8} />
          </div>
        </div>

        {/* Active Products */}
        <div
          onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
          className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all shadow-subtle flex items-center justify-between ${
            stockFilter === 'in_stock' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-border hover:border-emerald-200'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              منتجات متوفرة للبيع
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-700 num-tabular">
                {activeProductsCount}
              </span>
              <span className="text-xs text-ink-muted">موديل</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} strokeWidth={1.8} />
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all shadow-subtle flex items-center justify-between ${
            stockFilter === 'low_stock' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-border hover:border-amber-200'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              نواقص (أقل من 15 قطعة)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-700 num-tabular">
                {lowStockProductsCount}
              </span>
              <span className="text-xs text-ink-muted">موديلات حرجة</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={20} strokeWidth={1.8} />
          </div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all shadow-subtle flex items-center justify-between ${
            stockFilter === 'out_of_stock' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-border hover:border-rose-200'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              نفد من المخزون (0 قطعة)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-700 num-tabular">
                {outOfStockProductsCount}
              </span>
              <span className="text-xs text-ink-muted">بحاجة لتوريد</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle size={20} strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {/* ─── 2. CONTROLS BAR: SEARCH, CATEGORIES, AND FILTERS ─── */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-subtle space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search size={15} strokeWidth={1.8} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الموديل، الكود، أو العلامة التجارية..."
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-neutral-50 border border-border text-xs focus:outline-none focus:border-brand font-medium"
              />
            </div>

            {/* Category */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-border text-xs font-semibold text-neutral-700 focus:outline-none focus:border-brand"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'جميع التصنيفات' : c}</option>
              ))}
            </select>
          </div>

          {/* Add Product Button */}
          <button
            onClick={() => {
              setEditingProduct(null);
              setModalOpen(true);
            }}
            className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-ink hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-subtle active:scale-98 transition-all"
          >
            <Plus size={16} strokeWidth={2} />
            <span>إضافة منتج جديد للكتالوج</span>
          </button>
        </div>

        {/* Stock Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 hide-scrollbar border-t border-border/60">
          <span className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
            حالة المخزون:
          </span>
          {[
            { id: 'all', label: `الكل (${localProducts.length})` },
            { id: 'in_stock', label: `متوفر بالمخزون (${localProducts.filter((p) => p.isActive && p.stock > 15).length})` },
            { id: 'low_stock', label: `مخزون منخفض (${lowStockProductsCount})` },
            { id: 'out_of_stock', label: `نفد المخزون (${outOfStockProductsCount})` },
            { id: 'inactive', label: `موقوف (${localProducts.filter((p) => !p.isActive).length})` },
          ].map((tab) => {
            const isActive = stockFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStockFilter(tab.id as StockFilter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-ink text-white border-ink shadow-xs'
                    : 'bg-neutral-50 text-neutral-600 border-border hover:bg-neutral-100 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. PRODUCTS & INVENTORY TABLE ─── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-neutral-500 uppercase font-semibold text-[11px]">
                <th className="py-3.5 px-4">المنتج والموديل</th>
                <th className="py-3.5 px-3">التصنيف</th>
                <th className="py-3.5 px-3">تكلفة المنصة</th>
                <th className="py-3.5 px-3">جملة المسوق</th>
                <th className="py-3.5 px-3">سعر البيع المقترح</th>
                <th className="py-3.5 px-3">عمولة المسوق</th>
                <th className="py-3.5 px-4 min-w-[200px]">إدارة المخزون المباشرة</th>
                <th className="py-3.5 px-3 text-center">حالة العرض</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted">
                    <Package size={32} className="mx-auto text-neutral-300 mb-2" />
                    <p className="font-semibold text-xs text-ink">لا توجد منتجات تطابق هذا الفلتر</p>
                    <p className="text-[11px] mt-1">جرّب تغيير حالة المخزون أو كلمة البحث</p>
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  const isOutOfStock = prod.stock === 0;
                  const isLowStock = prod.stock > 0 && prod.stock <= 15;

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isOutOfStock ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0] || '/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'}
                            alt={prod.name_ar}
                            className="w-12 h-14 rounded-lg object-contain bg-zinc-950 border border-border flex-shrink-0"
                          />
                          <div>
                            <div className="font-bold text-ink line-clamp-1 text-xs">
                              {prod.name_ar}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              {prod.brand} • {prod.sizes.join(', ')}
                            </div>
                            <span className="text-[9px] font-mono text-neutral-400">
                              #{prod.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 font-medium text-neutral-600">
                        {prod.category}
                      </td>

                      {/* Pricing Matrix */}
                      <td className="py-3 px-3 font-mono text-neutral-500 num-tabular">
                        {prod.costPrice} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-ink num-tabular">
                        {prod.wholesalePrice} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-ink num-tabular">
                        {prod.suggestedPrice} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 num-tabular">
                        +{prod.commission} ج.م
                      </td>

                      {/* ── DIRECT INLINE INVENTORY MANAGEMENT CELL ── */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1.5">
                          {/* Stock status indicator badge */}
                          <div className="flex items-center gap-1.5">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                نفد المخزون
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                مخزون منخفض ({prod.stock} قطع)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                متوفر ({prod.stock} قطعة)
                              </span>
                            )}
                          </div>

                          {/* Editable Number Input & Fast Buttons */}
                          <div className="flex items-center gap-1">
                            {/* Fast -10 */}
                            <button
                              onClick={() => handleStockChange(prod.id, prod.stock - 10)}
                              className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center transition active:scale-95"
                              title="خصم 10 قطع"
                            >
                              -10
                            </button>

                            {/* Fast -1 */}
                            <button
                              onClick={() => handleStockChange(prod.id, prod.stock - 1)}
                              className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center transition active:scale-95"
                              title="خصم قطعة واحدة"
                            >
                              -
                            </button>

                            {/* Direct Editable Stock Input */}
                            <input
                              type="number"
                              min="0"
                              value={prod.stock}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                handleStockChange(prod.id, isNaN(val) ? 0 : val);
                              }}
                              className={`w-16 px-1.5 py-1 text-center rounded border font-mono font-bold text-xs num-tabular focus:outline-none focus:ring-2 focus:ring-brand ${
                                isOutOfStock
                                  ? 'border-rose-400 bg-rose-50/50 text-rose-800'
                                  : isLowStock
                                  ? 'border-amber-400 bg-amber-50/50 text-amber-800'
                                  : 'border-border bg-white text-ink'
                              }`}
                              title="انقر لتعديل عدد القطع بالمخزون مباشرة"
                            />

                            {/* Fast +1 */}
                            <button
                              onClick={() => handleStockChange(prod.id, prod.stock + 1)}
                              className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center transition active:scale-95"
                              title="إضافة قطعة واحدة"
                            >
                              +
                            </button>

                            {/* Fast +10 */}
                            <button
                              onClick={() => handleStockChange(prod.id, prod.stock + 10)}
                              className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center transition active:scale-95"
                              title="توريد +10 قطع"
                            >
                              +10
                            </button>

                            {/* Zero Out Button */}
                            <button
                              onClick={() => handleStockChange(prod.id, 0)}
                              className="px-1.5 py-1 rounded bg-neutral-100 hover:bg-rose-100 text-neutral-500 hover:text-rose-700 text-[10px] font-bold transition"
                              title="تصفير المخزون (0)"
                            >
                              تصفير
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* ── INTERACTIVE ACTIVE / INACTIVE TOGGLE ── */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          disabled={updatingId === prod.id}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                            prod.isActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-neutral-100 border-neutral-200 text-neutral-500 hover:bg-neutral-200'
                          }`}
                          title={prod.isActive ? 'انقر لإيقاف هذا المنتج مؤقتاً' : 'انقر لتفعيل هذا المنتج للبيع'}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              prod.isActive ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}
                          />
                          <span>{prod.isActive ? 'متاح للبيع' : 'موقوف'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition"
                            title="تعديل تفاصيل وأسعار المنتج"
                          >
                            <Edit2 size={13} strokeWidth={1.8} />
                          </button>

                          <button
                            onClick={() => handleDelete(prod.id, prod.name_ar)}
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-rose-100 text-neutral-600 hover:text-rose-700 transition"
                            title="حذف المنتج من الكتالوج"
                          >
                            <Trash2 size={13} strokeWidth={1.8} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

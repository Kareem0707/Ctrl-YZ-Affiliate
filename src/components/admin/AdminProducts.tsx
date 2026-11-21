'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
} from 'lucide-react';
import type { Product } from '@/lib/types';
import { deleteProduct, saveProduct } from '@/lib/dataService';
import ProductFormModal from './ProductFormModal';

interface AdminProductsProps {
  products: Product[];
  onRefresh: () => void;
}

export default function AdminProducts({ products, onRefresh }: AdminProductsProps) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === 'All' || p.category.toLowerCase() === selectedCat.toLowerCase();
      const matchSearch =
        !search.trim() ||
        p.name_ar.toLowerCase().includes(search.toLowerCase()) ||
        p.name_en.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, search]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`)) {
      await deleteProduct(id);
      onRefresh();
    }
  };

  const handleStockUpdate = async (p: Product, newStock: number) => {
    await saveProduct({ id: p.id, stock: Math.max(0, newStock) });
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Search */}
      <div className="bg-white p-4 rounded-xl border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search size={16} strokeWidth={1.6} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المنتج أو الماركة..."
              className="w-full pr-10 pl-3.5 py-2 rounded-lg bg-neutral-50 border border-border text-xs focus:outline-none focus:border-ink"
            />
          </div>

          {/* Category */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-neutral-50 border border-border text-xs font-medium text-neutral-700 focus:outline-none focus:border-ink"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'جميع التصنيفات' : c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-ink hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus size={15} strokeWidth={1.6} />
          <span>إضافة منتج جديد للكتالوج</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-neutral-500 uppercase font-semibold">
                <th className="py-3 px-3.5">المنتج</th>
                <th className="py-3 px-3.5">الفئة</th>
                <th className="py-3 px-3.5">تكلفة المنصة</th>
                <th className="py-3 px-3.5">جملة المسوق</th>
                <th className="py-3 px-3.5">سعر البيع المقترح</th>
                <th className="py-3 px-3.5">عمولة المسوق</th>
                <th className="py-3 px-3.5">المخزون المتوفر</th>
                <th className="py-3 px-3.5">الحالة</th>
                <th className="py-3 px-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-neutral-50/50 transition-colors">
                  {/* Product title & thumbnail */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.images[0] || '/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'}
                        alt={prod.name_ar}
                        className="w-10 h-13 rounded-lg object-contain bg-zinc-950 border border-border flex-shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-ink line-clamp-1">{prod.name_ar}</div>
                        <div className="text-[10px] text-neutral-400">{prod.brand} • {prod.sizes.join(', ')}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3.5 font-medium text-neutral-600">{prod.category}</td>

                  {/* Pricing Matrix */}
                  <td className="py-3 px-3.5 font-mono text-neutral-500 num-tabular">{prod.costPrice} ج.م</td>
                  <td className="py-3 px-3.5 font-mono font-bold text-ink num-tabular">{prod.wholesalePrice} ج.م</td>
                  <td className="py-3 px-3.5 font-mono font-bold text-ink num-tabular">{prod.suggestedPrice} ج.م</td>
                  <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 num-tabular">+{prod.commission} ج.م</td>

                  {/* Stock with quick buttons */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold num-tabular ${prod.stock < 15 ? 'text-red-600' : 'text-ink'}`}>
                        {prod.stock} قطعة
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStockUpdate(prod, prod.stock + 10)}
                          className="w-5 h-5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center"
                          title="+10 قطع"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleStockUpdate(prod, prod.stock - 10)}
                          className="w-5 h-5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center"
                          title="-10 قطع"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Active / Inactive */}
                  <td className="py-3 px-3.5">
                    {prod.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        متاح
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                        موقف
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-ink transition-colors"
                        title="تعديل المنتج"
                      >
                        <Edit2 size={13} strokeWidth={1.6} />
                      </button>

                      <button
                        onClick={() => handleDelete(prod.id, prod.name_ar)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors"
                        title="حذف المنتج"
                      >
                        <Trash2 size={13} strokeWidth={1.6} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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

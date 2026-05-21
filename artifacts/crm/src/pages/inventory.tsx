import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, AlertTriangle, ArrowDown, ArrowUp, Trash2 } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  quantity: number;
  minStock: number;
  costPrice: string;
  salePrice: string;
}

interface Movement {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export default function Inventory() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [productForm, setProductForm] = useState({ name: "", categoryId: "", quantity: "0", minStock: "0", costPrice: "0", salePrice: "0" });
  const [movementForm, setMovementForm] = useState({ productId: "", type: "in", quantity: "1", reason: "" });
  const [categoryName, setCategoryName] = useState("");

  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/inventory/categories", { headers });
      if (res.ok) setCategories(await res.json());
    } catch {}
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/inventory/products", { headers });
      if (res.ok) setProducts(await res.json());
    } catch {}
  }

  async function fetchMovements(productId: number) {
    try {
      const res = await fetch(`/api/inventory/movements?productId=${productId}`, { headers });
      if (res.ok) setMovements(await res.json());
    } catch {}
  }

  const filteredProducts = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && p.categoryId !== Number(filterCat)) return false;
    if (showLowStock && p.quantity > p.minStock) return false;
    return true;
  });

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productForm.name.trim()) return;
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          categoryId: productForm.categoryId || null,
          quantity: Number(productForm.quantity),
          minStock: Number(productForm.minStock),
          costPrice: productForm.costPrice,
          salePrice: productForm.salePrice,
        }),
      });
      if (res.ok) {
        toast({ title: "Produto criado" });
        setProductOpen(false);
        setProductForm({ name: "", categoryId: "", quantity: "0", minStock: "0", costPrice: "0", salePrice: "0" });
        fetchProducts();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Erro ao criar produto" });
      }
    } catch {
      toast({ title: "Erro ao criar produto" });
    }
  }

  async function handleDeleteProduct(id: number) {
    if (!confirm("Tem certeza?")) return;
    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast({ title: "Produto removido" });
        fetchProducts();
      }
    } catch {
      toast({ title: "Erro ao remover produto" });
    }
  }

  async function handleCreateMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!movementForm.productId) return;
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(movementForm.productId),
          type: movementForm.type,
          quantity: Number(movementForm.quantity),
          reason: movementForm.reason || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Movimentação registrada" });
        setMovementOpen(false);
        setMovementForm({ productId: "", type: "in", quantity: "1", reason: "" });
        fetchProducts();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Erro ao registrar movimentação" });
      }
    } catch {
      toast({ title: "Erro ao registrar movimentação" });
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      if (res.ok) {
        toast({ title: "Categoria criada" });
        setCategoryOpen(false);
        setCategoryName("");
        fetchCategories();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Erro ao criar categoria" });
      }
    } catch {
      toast({ title: "Erro ao criar categoria" });
    }
  }

  function viewProduct(product: Product) {
    setSelectedProduct(product);
    fetchMovements(product.id);
  }

  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {lowStockCount} produto(s) com estoque crítico
            </Badge>
          )}
          <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Nova Categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <Input placeholder="Nome da categoria" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                <Button type="submit" className="w-full">Criar</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Registrar Movimentação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateMovement} className="space-y-4">
                <Select value={movementForm.productId} onValueChange={(v) => setMovementForm({ ...movementForm, productId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.quantity} em estoque)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={movementForm.type} onValueChange={(v) => setMovementForm({ ...movementForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Saída</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min="1" placeholder="Quantidade" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} />
                <Input placeholder="Motivo (opcional)" value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} />
                <Button type="submit" className="w-full">Registrar</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={productOpen} onOpenChange={setProductOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Novo Produto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <Input placeholder="Nome do produto" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                <Select value={productForm.categoryId} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" min="0" placeholder="Qtd inicial" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} />
                  <Input type="number" min="0" placeholder="Estoque mínimo" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" step="0.01" min="0" placeholder="Preço de custo" value={productForm.costPrice} onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })} />
                  <Input type="number" step="0.01" min="0" placeholder="Preço de venda" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Criar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={showLowStock ? "default" : "outline"} onClick={() => setShowLowStock(!showLowStock)}>
          <AlertTriangle className="h-4 w-4 mr-1" />
          Estoque crítico
        </Button>
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Produto</th>
                <th className="text-left p-4 font-medium">Categoria</th>
                <th className="text-right p-4 font-medium">Qtd</th>
                <th className="text-right p-4 font-medium">Mínimo</th>
                <th className="text-right p-4 font-medium">Custo</th>
                <th className="text-right p-4 font-medium">Venda</th>
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum produto encontrado</td></tr>
              )}
              {filteredProducts.map((p) => {
                const isLow = p.quantity <= p.minStock;
                const cat = categories.find((c) => c.id === p.categoryId);
                return (
                  <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/50 cursor-pointer ${isLow ? "bg-red-50 dark:bg-red-950/10" : ""}`} onClick={() => viewProduct(p)}>
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {p.name}
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{cat?.name || "—"}</td>
                    <td className={`p-4 text-right font-medium ${isLow ? "text-red-600" : ""}`}>{p.quantity}</td>
                    <td className="p-4 text-right text-muted-foreground">{p.minStock}</td>
                    <td className="p-4 text-right">R$ {Number(p.costPrice).toFixed(2)}</td>
                    <td className="p-4 text-right">R$ {Number(p.salePrice).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Product Detail / Movements */}
      {selectedProduct && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{selectedProduct.name} — Histórico</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>Fechar</Button>
          </CardHeader>
          <CardContent>
            {movements.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>}
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  {m.type === "in" ? (
                    <ArrowDown className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    {m.type === "in" ? "Entrada" : m.type === "out" ? "Saída" : "Ajuste"}
                    {m.reason && <> — {m.reason}</>}
                  </span>
                </div>
                <span className={`text-sm font-medium ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                  {m.quantity > 0 ? "+" : ""}{m.quantity}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

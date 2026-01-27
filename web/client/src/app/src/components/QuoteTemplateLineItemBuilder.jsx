import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Package
} from 'lucide-react';

export default function QuoteTemplateLineItemBuilder({ lineItems, onChange }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load products from Product Catalog
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch('/api/products?active=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddLineItem = (product = null) => {
    const newItem = product ? {
      product_id: product.id,
      description: product.name,
      default_quantity: product.default_quantity || 1,
      unit: product.unit || 'item',
      section: ''
    } : {
      product_id: null,
      description: '',
      default_quantity: 1,
      unit: 'item',
      section: ''
    };

    onChange([...lineItems, newItem]);
    setShowProductSelector(false);
    setSearchTerm('');
  };

  const handleUpdateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveLineItem = (index) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const handleMoveLineItem = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === lineItems.length - 1)
    ) {
      return;
    }

    const updated = [...lineItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Line Items List */}
      {lineItems.length > 0 && (
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => handleMoveLineItem(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Line Item Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <Input
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="text-sm"
                      />
                      {item.product_id && (
                        <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Linked to Product Catalog
                        </span>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        value={item.default_quantity}
                        onChange={(e) => handleUpdateLineItem(index, 'default_quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className="text-sm"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={item.unit}
                        onChange={(e) => handleUpdateLineItem(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        value={item.section || ''}
                        onChange={(e) => handleUpdateLineItem(index, 'section', e.target.value)}
                        placeholder="Section (e.g., Foundations)"
                        className="text-sm"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLineItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Line Item Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowProductSelector(!showProductSelector)}
        >
          <Package className="w-4 h-4 mr-2" />
          Add from Product Catalog
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAddLineItem()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Item
        </Button>
      </div>

      {/* Product Selector */}
      {showProductSelector && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {loadingProducts ? (
                <p className="text-sm text-gray-500">Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'No products found' : 'No products in catalog. Add products in Product Catalog first.'}
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddLineItem(product)}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        {product.category && (
                          <div className="text-xs text-gray-500">{product.category}</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        £{product.client_price?.toFixed(2)} / {product.unit}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {lineItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No line items yet. Add items from your Product Catalog or create custom items.</p>
        </div>
      )}
    </div>
  );
}

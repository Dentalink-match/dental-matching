import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useEcommerce } from '@/contexts/EcommerceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Loader2, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ product, onAddToCart }) => (
  <Card className="overflow-hidden card-hover group">
    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
      <img
        src={product.image || 'https://via.placeholder.com/300'}
        alt={product.title}
        className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity"
      />
    </div>
    <CardContent className="p-4">
      <h3 className="font-semibold truncate text-gray-800">{product.title}</h3>
      <p className="text-sm text-gray-500 truncate h-5">{product.subtitle}</p>
      <div className="flex items-center justify-between mt-4">
        <p className="font-bold text-lg text-primary">
          {product.variants[0]?.price_formatted || 'N/A'}
        </p>
        <Button size="sm" onClick={() => onAddToCart(product.variants[0].id)}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </CardContent>
  </Card>
);

const PatientShop = () => {
  const navigate = useNavigate();
  const { patientProducts, loading, cart, addToCart, handleCheckout } = useEcommerce();

  return (
    <>
      <Helmet>
        <title>Patient's Shop - DentaLink</title>
        <meta name="description" content="Recommended products for patients." />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl md:text-2xl font-bold text-gradient">Patient's Shop</h1>
              </div>
              <Button onClick={handleCheckout} disabled={cart.length === 0}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Checkout ({cart.reduce((acc, item) => acc + item.quantity, 0)})
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading.patients ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : patientProducts.length === 0 ? (
            <div className="text-center py-24">
              <Package className="h-16 w-16 mx-auto text-gray-400" />
              <h3 className="mt-4 text-xl font-medium">Shop is Empty</h3>
              <p className="mt-1 text-sm text-gray-500">No products are available at the moment. Please check back later.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              {patientProducts.map(product => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <ProductCard product={product} onAddToCart={addToCart} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
};

export default PatientShop;
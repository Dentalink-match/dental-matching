import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { getProducts, initializeCheckout } from '@/api/EcommerceApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { ShoppingCart, Plus, Tag, DollarSign, Package, Loader2 } from 'lucide-react';

const ProductCard = ({ product, onAddToCart }) => (
  <Card className="overflow-hidden card-hover">
    <div className="aspect-square overflow-hidden">
      <img src={product.image || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-cover" />
    </div>
    <CardContent className="p-4">
      <h3 className="font-semibold truncate">{product.title}</h3>
      <p className="text-sm text-gray-500 truncate">{product.subtitle}</p>
      <div className="flex items-center justify-between mt-4">
        <p className="font-bold text-lg">
          {product.variants[0]?.price_formatted || 'N/A'}
        </p>
        <Button size="sm" onClick={() => onAddToCart(product.variants[0].id)}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </CardContent>
  </Card>
);

const AdminEcommerce = () => {
  const [doctorProducts, setDoctorProducts] = useState([]);
  const [patientProducts, setPatientProducts] = useState([]);
  const [loading, setLoading] = useState({ doctors: true, patients: true });

  const fetchProducts = async (collectionId, setter, loaderKey) => {
    try {
      // This is a placeholder. The EcommerceApi does not support filtering by collection.
      // We will fetch all products and then one would typically filter them.
      // For this implementation, we'll just show all products for both.
      const { products } = await getProducts({ limit: 50 });
      setter(products);
    } catch (error) {
      toast({
        title: 'Error fetching products',
        description: 'Could not load products from the store.',
        variant: 'destructive',
      });
      console.error(`Error fetching ${loaderKey} products:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [loaderKey]: false }));
    }
  };

  useEffect(() => {
    // In a real scenario, you'd have different collection IDs for doctor and patient products
    fetchProducts('doctors_collection_id_placeholder', setDoctorProducts, 'doctors');
    fetchProducts('patients_collection_id_placeholder', setPatientProducts, 'patients');
  }, []);

  const handleAddProduct = () => {
    toast({
      title: '🚧 Feature Not Implemented',
      description: "Please add products directly from your Hostinger store settings. This button is a placeholder for future integration.",
    });
  };

  const renderProductGrid = (products, isLoading) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No Products Found</h3>
          <p className="mt-1 text-sm text-gray-500">Add products to this collection in your store settings.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden card-hover">
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img src={product.image || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{product.title}</h3>
                <p className="text-sm text-gray-500 truncate">{product.subtitle || 'No subtitle'}</p>
                <div className="flex items-center justify-between mt-4">
                  <p className="font-bold text-lg">
                    {product.variants[0]?.price_formatted || 'N/A'}
                  </p>
                  <Button size="sm" variant="outline" onClick={handleAddProduct}>
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>E-commerce Management - Admin</title>
        <meta name="description" content="Manage products for Doctor and Patient shops." />
      </Helmet>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient">E-commerce Management</h1>
              <p className="text-gray-600 mt-1">Manage products for Doctor and Patient shops.</p>
            </div>
            <Button onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </div>

          <Tabs defaultValue="doctors">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="doctors">Doctor's Shop</TabsTrigger>
              <TabsTrigger value="patients">Patient's Shop</TabsTrigger>
            </TabsList>
            <TabsContent value="doctors" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Products for Doctors</CardTitle>
                  <CardDescription>These products will be available in the Doctor's Shop.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderProductGrid(doctorProducts, loading.doctors)}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="patients" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Products for Patients</CardTitle>
                  <CardDescription>These products will be available in the Patient's Shop.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderProductGrid(patientProducts, loading.patients)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </>
  );
};

export default AdminEcommerce;
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
    import { getProducts, initializeCheckout } from '@/api/EcommerceApi';
    import { toast } from '@/components/ui/use-toast';

    const EcommerceContext = createContext();

    export const useEcommerce = () => useContext(EcommerceContext);

    export const EcommerceProvider = ({ children }) => {
      const [doctorProducts, setDoctorProducts] = useState([]);
      const [patientProducts, setPatientProducts] = useState([]);
      const [loading, setLoading] = useState({ doctors: true, patients: true });
      const [cart, setCart] = useState([]);

      const fetchProducts = useCallback(async () => {
        try {
          setLoading({ doctors: true, patients: true });
          const { products } = await getProducts({ limit: 100 });
          
          setDoctorProducts(products);
          setPatientProducts(products);

        } catch (error) {
          toast({
            title: `Error Fetching Products`,
            description: 'Could not load products from the store.',
            variant: 'destructive',
          });
          console.error(`Error fetching products:`, error);
        } finally {
          setLoading({ doctors: false, patients: false });
        }
      }, []);

      useEffect(() => {
        fetchProducts();
      }, [fetchProducts]);

      const addToCart = useCallback((variantId, quantity = 1) => {
        setCart(prevCart => {
          const existingItem = prevCart.find(item => item.variant_id === variantId);
          if (existingItem) {
            return prevCart.map(item =>
              item.variant_id === variantId ? { ...item, quantity: item.quantity + quantity } : item
            );
          }
          return [...prevCart, { variant_id: variantId, quantity }];
        });
        toast({
          title: 'Product added to cart!',
          description: 'The item has been added to your shopping cart.',
        });
      }, []);

      const handleCheckout = useCallback(async () => {
        if (cart.length === 0) {
          toast({
            title: 'Cart is empty',
            description: 'Please add products to your cart before checking out.',
            variant: 'destructive',
          });
          return;
        }

        try {
          const { url } = await initializeCheckout({
            items: cart,
            successUrl: window.location.href,
            cancelUrl: window.location.href,
          });
          window.location.href = url;
        } catch (error) {
          toast({
            title: 'Checkout failed',
            description: 'Could not initiate the checkout process. Please try again.',
            variant: 'destructive',
          });
        }
      }, [cart]);

      const value = {
        doctorProducts,
        patientProducts,
        loading,
        cart,
        addToCart,
        handleCheckout,
      };

      return (
        <EcommerceContext.Provider value={value}>
          {children}
        </EcommerceContext.Provider>
      );
    };
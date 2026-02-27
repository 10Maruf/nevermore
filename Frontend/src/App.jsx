import React from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import ForgotPass from './pages/ForgotPass'
import SignUp from './pages/SignUp'
import SubmitOTP from './pages/SubmitOTP'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import ProfileChangePass from './pages/ProfileChangePass'
import EditProfile from './pages/editprofile'
import MenTees from './pages/men_tees'
import MenNewArrival from './pages/men_new_arrival'
import MenHoodies from './pages/men_hoodies'
import MenSweatshirts from './pages/men_sweatshirts'
import MenTankTops from './pages/men_tanktops'
import MenShorts from './pages/men_shorts'
import MenJoggers from './pages/men_joggers'
import MenPoloShirt from './pages/men_polo_shirt'
import MenWindbreaker from './pages/men_windbreaker'
import Men from './pages/men'
import WomenNewArrival from './pages/women_new_arrival'
import WomenTees from './pages/women_tees'
import WomenHoodies from './pages/women_hoodies'
import WomenSweatshirts from './pages/women_sweatshirts'
import WomenTankTops from './pages/women_tanktops'
import WomenShorts from './pages/women_shorts'
import WomenJoggers from './pages/women_joggers'
import WomenPoloShirt from './pages/women_polo_shirt'
import WomenWindbreaker from './pages/women_windbreaker'
import Women from './pages/women'
import ToteBag from './pages/tote_bag'
import Wallet from './pages/wallet'
import Cap from './pages/cap'
import Backpack from './pages/backpack'
import HomeDecor from './pages/home_decor'
import Accessories from './pages/accessories'
import AccessoriesNewArrival from './pages/accessories_new_arrival'
import Wishlist from './pages/wishlist'
import Payment from './pages/Payment'
import PaymentSuccess from './pages/PaymentSuccess'
import ShopCategory from './pages/shop_category'
import Cart from './pages/cart'
import ProductView from './pages/ProductView'
import Refund from './pages/refund'
import SearchResults from './pages/SearchResults'
import ProtectedRoute from './lib/ProtectedRoute'
import CustomDesign from './pages/customdesign'

// Admin imports
import AdminProtectedRoute from './lib/AdminProtectedRoute'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/pages/Dashboard'
import ViewOrders from './admin/pages/ViewOrders'
import ManageProducts from './admin/pages/ManageProducts'
import ManagePricing from './admin/pages/ManagePricing'
import ManageDiscount from './admin/pages/ManageDiscount'
import HandleRefunds from './admin/pages/HandleRefunds'
import GenerateReports from './admin/pages/GenerateReports'
import ManageCategoryImages from './admin/pages/ManageCategoryImages'

// Bridge to keep existing pages working: pass a navigate(to) function prop that maps to react-router navigation.
function WithNavigate({ children }){
  const navigate = useNavigate()
  const location = useLocation()
  const nav = (to) => {
    if (!to) return
    // Support old hash-like paths like 'men/tees' and base paths like 'home'
    const normalized = to === 'home' ? '/' : to.startsWith('/') ? to : `/${to}`
    if (normalized === location.pathname) return
    navigate(normalized)
  }
  return children(nav)
}

export default function App(){
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={
        <WithNavigate>{(navigate)=> <Homepage navigate={navigate} />}</WithNavigate>
      } />

      {/* Auth */}
      <Route path="/login" element={
        <WithNavigate>{(navigate)=> <Login navigate={navigate} />}</WithNavigate>
      } />
      <Route path="/forgot" element={<WithNavigate>{(navigate)=> <ForgotPass navigate={navigate} />}</WithNavigate>} />
      <Route path="/signup" element={<WithNavigate>{(navigate)=> <SignUp navigate={navigate} />}</WithNavigate>} />
      <Route path="/submitotp" element={<WithNavigate>{(navigate)=> <SubmitOTP navigate={navigate} />}</WithNavigate>} />
      <Route path="/reset-password" element={<WithNavigate>{(navigate)=> <ResetPassword navigate={navigate} />}</WithNavigate>} />

      {/* Profile (protected) */}
      <Route element={<ProtectedRoute />}> 
        <Route path="/profile" element={<WithNavigate>{(navigate)=> <Profile navigate={navigate} />}</WithNavigate>} />
        <Route path="/profile/change-password" element={<WithNavigate>{(navigate)=> <ProfileChangePass navigate={navigate} />}</WithNavigate>} />
        <Route path="/profile/edit" element={<WithNavigate>{(navigate)=> <EditProfile navigate={navigate} />}</WithNavigate>} />
      </Route>

      {/* Category Overview */}
      <Route path="/shop_category" element={<WithNavigate>{(navigate)=> <ShopCategory navigate={navigate} />}</WithNavigate>} />
      <Route path="/men" element={<WithNavigate>{(navigate)=> <Men navigate={navigate} />}</WithNavigate>} />
      <Route path="/women" element={<WithNavigate>{(navigate)=> <Women navigate={navigate} />}</WithNavigate>} />
      <Route path="/accessories" element={<WithNavigate>{(navigate)=> <Accessories navigate={navigate} />}</WithNavigate>} />

      {/* Men */}
      <Route path="/men/tees" element={<WithNavigate>{(navigate)=> <MenTees navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/new-arrival" element={<WithNavigate>{(navigate)=> <MenNewArrival navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/hoodies" element={<WithNavigate>{(navigate)=> <MenHoodies navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/sweatshirts" element={<WithNavigate>{(navigate)=> <MenSweatshirts navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/tanktops" element={<WithNavigate>{(navigate)=> <MenTankTops navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/shorts" element={<WithNavigate>{(navigate)=> <MenShorts navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/joggers" element={<WithNavigate>{(navigate)=> <MenJoggers navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/polo-shirt" element={<WithNavigate>{(navigate)=> <MenPoloShirt navigate={navigate} />}</WithNavigate>} />
      <Route path="/men/windbreaker" element={<WithNavigate>{(navigate)=> <MenWindbreaker navigate={navigate} />}</WithNavigate>} />

      {/* Women */}
      <Route path="/women/new-arrival" element={<WithNavigate>{(navigate)=> <WomenNewArrival navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/tees" element={<WithNavigate>{(navigate)=> <WomenTees navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/hoodies" element={<WithNavigate>{(navigate)=> <WomenHoodies navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/sweatshirts" element={<WithNavigate>{(navigate)=> <WomenSweatshirts navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/tanktops" element={<WithNavigate>{(navigate)=> <WomenTankTops navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/shorts" element={<WithNavigate>{(navigate)=> <WomenShorts navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/joggers" element={<WithNavigate>{(navigate)=> <WomenJoggers navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/polo-shirt" element={<WithNavigate>{(navigate)=> <WomenPoloShirt navigate={navigate} />}</WithNavigate>} />
      <Route path="/women/windbreaker" element={<WithNavigate>{(navigate)=> <WomenWindbreaker navigate={navigate} />}</WithNavigate>} />

      {/* Accessories */}
      <Route path="/accessories/new-arrival" element={<WithNavigate>{(navigate)=> <AccessoriesNewArrival navigate={navigate} />}</WithNavigate>} />
      <Route path="/accessories/tote" element={<WithNavigate>{(navigate)=> <ToteBag navigate={navigate} />}</WithNavigate>} />
      <Route path="/accessories/wallet" element={<WithNavigate>{(navigate)=> <Wallet navigate={navigate} />}</WithNavigate>} />
      <Route path="/accessories/cap" element={<WithNavigate>{(navigate)=> <Cap navigate={navigate} />}</WithNavigate>} />
      <Route path="/accessories/backpack" element={<WithNavigate>{(navigate)=> <Backpack navigate={navigate} />}</WithNavigate>} />
      <Route path="/accessories/home-decor" element={<WithNavigate>{(navigate)=> <HomeDecor navigate={navigate} />}</WithNavigate>} />

      {/* Other */}
      <Route path="/wishlist" element={<WithNavigate>{(navigate)=> <Wishlist navigate={navigate} />}</WithNavigate>} />
      <Route path="/cart" element={<WithNavigate>{(navigate)=> <Cart navigate={navigate} />}</WithNavigate>} />
      <Route path="/payment" element={<WithNavigate>{(navigate)=> <Payment navigate={navigate} />}</WithNavigate>} />
      <Route path="/payment-success" element={<WithNavigate>{(navigate)=> <PaymentSuccess navigate={navigate} />}</WithNavigate>} />
      <Route path="/refund" element={<WithNavigate>{(navigate)=> <Refund navigate={navigate} />}</WithNavigate>} />
      <Route path="/search" element={<WithNavigate>{(navigate)=> <SearchResults navigate={navigate} />}</WithNavigate>} />
      <Route path="/custom-design" element={<WithNavigate>{(navigate)=> <CustomDesign navigate={navigate} />}</WithNavigate>} />

      {/* Product */}
      <Route path="/product/:productId" element={<WithNavigate>{(navigate)=> <ProductViewRoute navigate={navigate} />}</WithNavigate>} />

      {/* Admin Routes (Protected) */}
      <Route path="/admin" element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<ViewOrders />} />
          <Route path="products" element={<ManageProducts />} />
          <Route path="pricing" element={<ManagePricing />} />
          <Route path="discount" element={<ManageDiscount />} />
          <Route path="refunds" element={<HandleRefunds />} />
          <Route path="reports" element={<GenerateReports />} />
          <Route path="category-images" element={<ManageCategoryImages />} />
        </Route>
      </Route>

      {/* Back-compat: support old hash URLs by redirecting from # paths if loaded with hash */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProductViewRoute({ navigate }){
  const { productId } = useParams()
  return <ProductView navigate={navigate} productId={productId} />
}

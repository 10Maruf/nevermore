import React from 'react'
import CategoryProducts from './CategoryProducts'

export default function Wallet({ navigate }) {
  return <CategoryProducts navigate={navigate} categorySlug="wallets" pageTitle="WALLETS COLLECTION" />
}

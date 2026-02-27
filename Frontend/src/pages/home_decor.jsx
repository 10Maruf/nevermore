import React from 'react'
import CategoryProducts from './CategoryProducts'

export default function HomeDecor({ navigate }) {
  return <CategoryProducts navigate={navigate} categorySlug="home-decor" pageTitle="HOME & DECOR" />
}

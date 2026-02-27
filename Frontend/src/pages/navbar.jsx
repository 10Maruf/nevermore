// This file used to contain a separate legacy header.
// Many pages import it as `Header` and expect a `navigate(to)` prop.
// To keep behavior consistent and fix search everywhere, delegate to the real Navbar.

import React from 'react'
import Navbar from '../components/Navbar'

export default function Header(props) {
  return <Navbar {...props} />
}

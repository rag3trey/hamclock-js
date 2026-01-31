import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tantml:invoke>
<invoke name="run_in_terminal">
<parameter name="command">cd /Users/trey/Documents/hamclock-py/frontend && mv src/components/WorldMap.jsx src/components/WorldMap_OLD.jsx
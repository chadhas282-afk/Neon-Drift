import { useState, useEffect, useRef, useCallback } from "react";

const W = 400, H = 560;
const ROAD_LEFT = 55, ROAD_RIGHT = W - 55;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
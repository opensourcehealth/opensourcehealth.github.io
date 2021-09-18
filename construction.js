//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function drillByToolPillar(matrix, toolPillar, transform2Ds, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformedPolygons(toolPolygon, transform2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				drillByPolygon(strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function drillByPolygon(strata, toolPolygon, workMesh) {
	var toolDirected = getDirectedPolygon(false, toolPolygon)
	var facetIntersections = getFacetIntersectionsCheckDirection(true, false, strata, toolDirected, workMesh)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(true, facetIntersectionIndex, facetIntersections)
	}
	var alongMapMeetings = getAlongMapMeetings(facetIntersections, toolDirected, workMesh)
	var workMap = new Map()
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(
			alongMapMeetings, {tool:1, work:-1}, facetIntersection, facetIntersections, strata, toolDirected, workMap, workMesh)
	}
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
}

function embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh) {
	var toolMeshFacets = getArraysCopy(toolMesh.facets)
	var toolMeshPoints = getArraysCopy(toolMesh.points)
	var xyFacet = null
	var xyFacetIndex = 0
	var toolDirected = null
	for (; xyFacetIndex < toolMeshFacets.length; xyFacetIndex++) {
		xyFacet = toolMeshFacets[xyFacetIndex]
		var polygon = getPolygonByFacet(xyFacet, toolMeshPoints)
		var isZZero = true
		for (var point of polygon) {
			if (point[2] != 0.0) {
				isZZero = false
				break
			}
		}
		if (isZZero) {
			toolDirected = polygon
			break
		}
	}
	if (toolDirected == null) {
		xyFacetIndex = 0
		xyFacet = toolMeshFacets[0]
		toolDirected = getPolygonByFacet(xyFacet, toolMeshPoints)
	}
	if (getIsClockwise(toolDirected) != isTop) {
		reverseArray(toolMeshFacets)
		toolDirected.reverse()
	}
	for (var strata of stratas) {
		var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
		var maximumZ = -Number.MAX_VALUE
		var minimumZ = Number.MAX_VALUE
		for (var facetIntersection of facetIntersections) {
			if (facetIntersection.isClockwise != isTop && facetIntersection.isPartlyHorizontal) {
				for (var point of toolDirected) {
					if (getIsPointInsidePolygon(point, facetIntersection.workPolygon)) {
						var z = getZByPointPolygon(point, facetIntersection.workPolygon)
						maximumZ = Math.max(maximumZ, z)
						minimumZ = Math.min(minimumZ, z)
					}
				}
			}
		}
		for (var facetIntersectionIndex = 0; facetIntersectionIndex < facetIntersections.length; facetIntersectionIndex++) {
			var facetIntersection = facetIntersections[facetIntersectionIndex]
			if (facetIntersection.isClockwise == isTop || !facetIntersection.isPartlyHorizontal) {
				for (var point of facetIntersection.workPolygon) {
					if (point[2] > maximumZ || point[2] < minimumZ) {
						facetIntersections[facetIntersectionIndex] = null
						break
					}
				}
			}
		}
		removeNulls(facetIntersections)
		var sharedArrows = getSharedArrows(facetIntersections, workMesh.facets)
		var alongMapMeetings = getAlongMapMeetings(facetIntersections, toolDirected, workMesh)
		var workMap = new Map()
		for (var facetIntersection of facetIntersections) {
			alterFacetsAddHorizontals(
				alongMapMeetings, {tool:1, work:-1}, facetIntersection, facetIntersections, strata, toolDirected, workMap, workMesh)
		}
		var borderSet = new Set()
		var xySet = new Set()
		for (var pointIndex of xyFacet) {
			xySet.add(pointIndex)
		}
		for (var toolFacetIndex = 0; toolFacetIndex < toolMeshFacets.length; toolFacetIndex++) {
			if (toolFacetIndex != xyFacetIndex) {
				var toolFacet = toolMeshFacets[toolFacetIndex]
				for (var pointIndexIndex = 0; pointIndexIndex < toolFacet.length; pointIndexIndex++) {
					var pointIndex = toolFacet[pointIndexIndex]
					if (!xySet.has(pointIndex)) {
						if (xySet.has(toolFacet[(pointIndexIndex - 1 + toolFacet.length) % toolFacet.length])) {
							borderSet.add(pointIndex)
						}
						else {
							if (xySet.has(toolFacet[(pointIndexIndex + 1) % toolFacet.length])) {
								borderSet.add(pointIndex)
							}
						}
					}
				}
			}
		}
		var averageBorderHeight = 0.0
		for (var pointIndex of borderSet) {
			averageBorderHeight += toolMeshPoints[pointIndex][2]
		}
		var isConnectionAboveXY = averageBorderHeight > 0.0
		var outerZ = null
		var pointToolIndexMap = new Map()
		for (var toolPointIndex = 0; toolPointIndex < toolDirected.length; toolPointIndex++) {
			for (var facetIntersection of facetIntersections) {
				if (facetIntersection.toolMeshIndexMap.has(toolPointIndex)) {
					var inversePointIndex = facetIntersection.toolMeshIndexMap.get(toolPointIndex)
					var inversePointZ = inversePoints[inversePointIndex][2]
					if (outerZ == null) {
						outerZ = inversePointZ
					}
					else {
						if (isConnectionAboveXY) {
							outerZ = Math.max(outerZ, inversePointZ)
						}
						else {
							outerZ = Math.min(outerZ, inversePointZ)
						}
					}
					pointToolIndexMap.set(xyFacet[toolPointIndex], inversePointIndex)
					break
				}
			}
		}
		for (var pointIndex of xyFacet) {
			addToPointToolMap(facetIntersections, inversePoints, outerZ, pointIndex, pointToolIndexMap, toolMeshPoints)
		}
		for (var toolFacet of toolMeshFacets) {
			for (var pointIndex of toolFacet) {
				if (!pointToolIndexMap.has(pointIndex)) {
					pointToolIndexMap.set(pointIndex, inversePoints.length)
					var toolMeshPoint = toolMeshPoints[pointIndex]
					toolMeshPoint[2] += outerZ
					inversePoints.push(toolMeshPoint)
				}
			}
			for (var pointIndexIndex = 0; pointIndexIndex < toolFacet.length; pointIndexIndex++) {
				toolFacet[pointIndexIndex] = pointToolIndexMap.get(toolFacet[pointIndexIndex])
			}
		}
		var segmentMap = new Map()
		var arrowPointIndexSet = new Set()
		addElementListsToSet(sharedArrows, arrowPointIndexSet)
		for (var pointIndex of xyFacet) {
			if (!arrowPointIndexSet.has(pointIndex)) {
				var point = inversePoints[pointIndex]
				for (var sharedArrow of sharedArrows) {
					if (getIsXYZSegmentClose(inversePoints[sharedArrow[0]], inversePoints[sharedArrow[1]], point)) {
						addArrayElementToMap(pointIndex, getEdgeKey(sharedArrow[0], sharedArrow[1]), segmentMap)
					}
				}
			}
		}
		addPointsToFacets(workMesh, segmentMap)
		for (var toolFacetIndex = 0; toolFacetIndex < toolMeshFacets.length; toolFacetIndex++) {
			var toolFacet = toolMeshFacets[toolFacetIndex]
			if (toolFacetIndex != xyFacetIndex) {
				workMesh.facets.push(getFacetByWorkMap(toolFacet, workMap))
			}
		}
	}
}

function embossMeshesByTransform2Ds(matrix, isTop, stratas, toolMeshes, transform2Ds, workMesh) {
	if (toolMeshes == null) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), originalPoints)
	workMesh.points = inversePoints
	for (var toolMesh of toolMeshes) {
		if (transform2Ds == null) {
			embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
		}
		else {
			var toolMeshPoints = getArraysCopy(toolMesh.points)
			for (var transform of transform2Ds) {
				setArraysToArraysUntil(toolMesh.points, toolMeshPoints, 2)
				transform2DPoints(toolMesh.points, transform)
				embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
			}
			setArraysToArraysUntil(toolMesh.points, toolMeshPoints, 2)
		}
	}
	pushArray(originalPoints, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	workMesh.points = originalPoints
	removeUnfacetedPoints(workMesh)
}

function sectionByPillar(matrix, toolPillar, transform2Ds, workMesh) {
	var originalPoints = workMesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), originalPoints)
	workMesh.points = inversePoints
	var intersectionFacets = []
	var originalFacets = getArraysCopy(workMesh.facets)
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformedPolygons(toolPolygon, transform2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				sectionByPolygon(intersectionFacets, originalFacets, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.facets = intersectionFacets
	workMesh.points = originalPoints
	pushArray(workMesh.points, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function sectionByPolygon(intersectionFacets, originalFacets, strata, toolPolygon, workMesh) {
	workMesh.facets = getArraysCopy(originalFacets)
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersectionsCheckDirection(true, true, strata, toolDirected, workMesh)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(true, facetIntersectionIndex, facetIntersections)
	}
	var alongMapMeetings = getAlongMapMeetings(facetIntersections, toolDirected, workMesh)
	var workMap = new Map()
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(
			alongMapMeetings, {tool:1, work:1}, facetIntersection, facetIntersections, strata, toolDirected, workMap, workMesh)
	}
	var facetIndexSet = new Set()
	for (var facetIntersection of facetIntersections) {
		facetIndexSet.add(facetIntersection.facetIndex)
	}
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		if (!facetIndexSet.has(facetIndex)) {
			workMesh.facets[facetIndex] = null
		}
	}
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	for (var facet of workMesh.facets) {
		if (!getIsEmpty(facet)) {
			intersectionFacets.push(facet)
		}
	}
}

function weldByPillar(matrix, toolPillar, transform2Ds, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformedPolygons(toolPolygon, transform2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				weldByPolygon(strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function weldByPolygon(strata, toolPolygon, workMesh) {
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersectionsCheckDirection(false, true, strata, toolDirected, workMesh)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(false, facetIntersectionIndex, facetIntersections)
	}
	var alongMapMeetings = getAlongMapMeetings(facetIntersections, toolDirected, workMesh)
	var workMap = new Map()
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(
			alongMapMeetings, {tool:1, work:-1}, facetIntersection, facetIntersections, strata, toolDirected, workMap, workMesh)
	}
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
}

var gDrill = {
	name: 'drill',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh == null) {
			return
		}
		var polygons = getPolygonsByChildren(statement.children)
		if (getIsEmpty(polygons)) {
			return
		}
		var stratas = getStratas(attributeMap)
		var transformed3DMatrix = getTransformed3DMatrix(null, statement)
		var toolPillar = {polygons:polygons, stratas:stratas}
		var transform2Ds = getTransform2DsByChildren(statement.children)
		drillByToolPillar(transformed3DMatrix, toolPillar, transform2Ds, workMesh)
		analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gEmboss = {
	name: 'emboss',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh == null) {
			return
		}
		var stratas = getStratas(attributeMap)
		var transformed3DMatrix = getTransformed3DMatrix(null, statement)
		var isTop = true
		if (attributeMap.has('top')) {
			var topString = attributeMap.get('top')
			if (topString.length > 0) {
				if (topString[0] == 'f') {
					isTop = false
				}
			}
		}
		var toolMeshes = getMeshesByChildren(statement.children, registry)
		var transform2Ds = getTransform2DsByChildren(statement.children)
		embossMeshesByTransform2Ds(transformed3DMatrix, isTop, stratas, toolMeshes, transform2Ds, workMesh)
		analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gSection = {
	name: 'section',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh == null) {
			return
		}
		var polygons = getPolygonsByChildren(statement.children)
		if (getIsEmpty(polygons)) {
			return
		}
		var stratas = getStratas(attributeMap)
		var toolPillar = {polygons:polygons, stratas:stratas}
		var transform2Ds = getTransform2DsByChildren(statement.children)
		var transformed3DMatrix = getTransformed3DMatrix(null, statement)
		sectionByPillar(transformed3DMatrix, toolPillar, transform2Ds, workMesh)
		analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gWeld = {
	name: 'weld',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh == null) {
			return
		}
		var polygons = getPolygonsByChildren(statement.children)
		if (getIsEmpty(polygons)) {
			return
		}
		var stratas = getStratas(attributeMap)
		var transformed3DMatrix = getTransformed3DMatrix(null, statement)
		var toolPillar = {polygons:polygons, stratas:stratas}
		var transform2Ds = getTransform2DsByChildren(statement.children)
		weldByPillar(transformed3DMatrix, toolPillar, transform2Ds, workMesh)
		analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gConstructionProcessors = [gDrill, gEmboss, gSection, gWeld]

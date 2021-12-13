//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetsToLoneArrowSet(beginIndex, facets, loneArrowSet) {
	for (var facet of facets) {
		addFacetToLoneArrowSet(beginIndex, facet, loneArrowSet)
	}
	return loneArrowSet
}

function addFacetToLoneArrowSet(beginIndex, facet, loneArrowSet) {
	var endIndex = 1 - beginIndex
	if (facet == null) {
		return
	}
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var consecutiveStrings = [facet[vertexIndex].toString(), facet[(vertexIndex + 1) % facet.length].toString()]
		var reverseKey = consecutiveStrings[endIndex] + ' ' + consecutiveStrings[beginIndex]
		if (loneArrowSet.has(reverseKey)) {
			loneArrowSet.delete(reverseKey)
		}
		else {
			loneArrowSet.add(consecutiveStrings[beginIndex] + ' ' + consecutiveStrings[endIndex])
		}
	}
}

function drillByPillar(matrix, splitHeights, toolPillar, transform2Ds, workMesh) {
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
				drillByPolygon(splitHeights, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function drillByPolygon(splitHeights, strata, toolPolygon, workMesh) {
	var toolDirected = getDirectedPolygon(false, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var missingArrowSet = getMissingArrowSet(facetIntersections)
	var originalFacetIntersections = facetIntersections.slice(0)
	var originalFacetLength = workMesh.facets.length
	directFacetIntersections(facetIntersections, true)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(true, facetIntersectionIndex, facetIntersections)
	}
	var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
	sortRemoveMeetingsByFacetIntersections(facetIntersections)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'd', strata, toolDirected, workMesh)
	}
	var workMap = getDrillWorkMap(originalFacetIntersections, workMesh.facets, missingArrowSet, originalFacetLength)
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	var facetIndexStart = workMesh.facets.length
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	addSplitIndexesByHeights(facetIndexStart, splitHeights, workMesh)
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
		var missingArrowSet = getMissingArrowSet(facetIntersections)
		var originalFacetIntersections = facetIntersections.slice(0)
		var originalFacetLength = workMesh.facets.length
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
		var closeFacetIntersections = []
		for (var facetIntersectionIndex = 0; facetIntersectionIndex < facetIntersections.length; facetIntersectionIndex++) {
			var facetIntersection = facetIntersections[facetIntersectionIndex]
			if (facetIntersection.isClockwise == isTop || !facetIntersection.isPartlyHorizontal) {
				for (var point of facetIntersection.workPolygon) {
					if (point[2] > maximumZ || point[2] < minimumZ) {
						closeFacetIntersections.push(facetIntersection)
						facetIntersections[facetIntersectionIndex] = null
						break
					}
				}
			}
		}
		removeNulls(facetIntersections)
		var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
		sortRemoveMeetingsByFacetIntersections(facetIntersections)
		var arrowAlongMap = new Map()
		for (var facetIntersection of facetIntersections) {
			var alongIndexesMap = facetIntersection.alongIndexesMap
			for (var nodeKey of alongIndexesMap.keys()) {
				var nodeStrings = nodeKey.split(',')
				if (nodeStrings[0] == 'w') {
					var facet = workMesh.facets[facetIntersection.facetIndex]
					var beginIndex = parseInt(nodeStrings[1])
					var endIndex = (beginIndex + 1) % facet.length
					arrowAlongMap.set(facet[endIndex].toString() + ' ' + facet[beginIndex].toString(), alongIndexesMap.get(nodeKey))
				}
			}
		}
		for (var facetIntersection of facetIntersections) {
			alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'd', strata, toolDirected, workMesh)
		}
		for (var closeFacetIntersection of closeFacetIntersections) {
			var facet = workMesh.facets[closeFacetIntersection.facetIndex]
			for (var vertexIndex = facet.length - 1; vertexIndex > -1; vertexIndex--) {
				var endVertexIndex = (vertexIndex + 1) % facet.length
				var arrowKey = facet[vertexIndex].toString() + ' ' + facet[endVertexIndex].toString()
				if (arrowAlongMap.has(arrowKey)) {
					var alongIndexes = arrowAlongMap.get(arrowKey)
					var segment = new Array(alongIndexes.length)
					for (var alongIndexIndex = 0; alongIndexIndex < alongIndexes.length; alongIndexIndex++) {
						segment[alongIndexIndex] = meetings[alongIndexes[alongIndexIndex][1]].pointIndex
					}
					segment.reverse()
					spliceArray(facet, endVertexIndex, segment)
				}
			}
		}
		var borderSet = new Set()
		var xySet = new Set(xyFacet)
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
			for (var pointIndexIndex = 0; pointIndexIndex < toolFacet.length; pointIndexIndex++) {
				var pointIndex = toolFacet[pointIndexIndex]
				if (!pointToolIndexMap.has(pointIndex)) {
					pointToolIndexMap.set(pointIndex, inversePoints.length)
					var toolMeshPoint = toolMeshPoints[pointIndex]
					toolMeshPoint[2] += outerZ
					inversePoints.push(toolMeshPoint)
				}
				toolFacet[pointIndexIndex] = pointToolIndexMap.get(pointIndex)
			}
		}
		var workMap = getDrillWorkMap(originalFacetIntersections, workMesh.facets, missingArrowSet, originalFacetLength)
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

function getDrillWorkMap(facetIntersections, facets, loneArrowSet, originalFacetLength) {
	for (var facetIntersection of facetIntersections) {
		var facet = facets[facetIntersection.facetIndex]
		addFacetToLoneArrowSet(0, facet, loneArrowSet)
	}
	for (var facetIndex = originalFacetLength; facetIndex < facets.length; facetIndex++) {
		addFacetToLoneArrowSet(0, facets[facetIndex], loneArrowSet)
	}
	return getWorkMapByArrowSet(loneArrowSet)
}

function getMissingArrowSet(facetIntersections) {
	var missingArrowSet = new Set()
	for (var facetIntersection of facetIntersections) {
		addFacetToLoneArrowSet(1, facetIntersection.workFacet, missingArrowSet)
	}
	return missingArrowSet
}

function getWorkMapByArrowSet(arrowSet) {
	var workMap = new Map()
	for (var arrow of arrowSet) {
		var splitKey = arrow.split(' ')
		workMap.set(parseInt(splitKey[1]), parseInt(splitKey[0]))
	}
	return workMap
}

function sectionByPillar(matrix, splitHeights, toolPillar, transform2Ds, workMesh) {
	var originalPoints = workMesh.points
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), originalPoints)
	workMesh.points = inversePoints
	var intersectionFacets = []
	var originalFacets = getArraysCopy(workMesh.facets)
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformedPolygons(toolPolygon, transform2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				sectionByPolygon(intersectionFacets, originalFacets, splitHeights, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.facets = intersectionFacets
	workMesh.points = originalPoints
	pushArray(workMesh.points, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function sectionByPolygon(intersectionFacets, originalFacets, splitHeights, strata, toolPolygon, workMesh) {
	workMesh.facets = getArraysCopy(originalFacets)
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var originalFacetIntersections = facetIntersections.slice(0)
	var originalFacetLength = workMesh.facets.length
	directFacetIntersections(facetIntersections, true)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(true, facetIntersectionIndex, facetIntersections)
	}
	var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
	sortRemoveMeetingsByFacetIntersections(facetIntersections)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'i', strata, toolDirected, workMesh)
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
	var workMap = getDrillWorkMap(originalFacetIntersections, workMesh.facets, new Set(), originalFacetLength)
	var facetIndexStart = workMesh.facets.length
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	addSplitIndexesByHeights(facetIndexStart, splitHeights, workMesh)
	for (var facet of workMesh.facets) {
		if (!getIsEmpty(facet)) {
			intersectionFacets.push(facet)
		}
	}
}

function setSplitIndexesAttribute(statement, workMesh) {
	if (workMesh.splits == undefined) {
		return
	}
	if (workMesh.splits.length > 0) {
		workMesh.splits.sort(compareNumberAscending)
		statement.attributeMap.set('splits', workMesh.splits.toString())
	}
}

function weldByPillar(matrix, splitHeights, toolPillar, transform2Ds, workMesh) {
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
				weldByPolygon(splitHeights, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function weldByPolygon(splitHeights, strata, toolPolygon, workMesh) {
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var missingArrowSet = getMissingArrowSet(facetIntersections)
	var originalFacetIntersections = facetIntersections.slice(0)
	var originalFacetLength = workMesh.facets.length
	directFacetIntersections(facetIntersections, false)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(false, facetIntersectionIndex, facetIntersections)
	}
	var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
	sortRemoveMeetingsByFacetIntersections(facetIntersections)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'd', strata, toolDirected, workMesh)
	}
	var workMap = getDrillWorkMap(originalFacetIntersections, workMesh.facets, missingArrowSet, originalFacetLength)
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	var facetIndexStart = workMesh.facets.length
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	addSplitIndexesByHeights(facetIndexStart, splitHeights, workMesh)
}

var gDrill = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'drill',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var polygons = getPolygonsRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			return
		}
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		var stratas = getStratas(registry, statement)
		var transformed3DMatrix = getTransformed3DMatrix(null, registry, statement)
		var toolPillar = {polygons:polygons, stratas:stratas}
		var transform2Ds = getTransform2DsByChildren(statement.children, registry)
		drillByPillar(transformed3DMatrix, splitHeights, toolPillar, transform2Ds, workMesh)
		setSplitIndexesAttribute(statement, workMesh)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gEmboss = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'emboss',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var isTop = getBooleanByDefault(true, 'top', registry, statement, this.name)
		var stratas = getStratas(registry, statement)
		var transformed3DMatrix = getTransformed3DMatrix(null, registry, statement)
		var toolMeshes = getMeshesByChildren(statement.children, registry)
		var transform2Ds = getTransform2DsByChildren(statement.children, registry)
		embossMeshesByTransform2Ds(transformed3DMatrix, isTop, stratas, toolMeshes, transform2Ds, workMesh)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gSection = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'section',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var polygons = getPolygonsRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			return
		}
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		var stratas = getStratas(registry, statement)
		var toolPillar = {polygons:polygons, stratas:stratas}
		var transform2Ds = getTransform2DsByChildren(statement.children, registry)
		var transformed3DMatrix = getTransformed3DMatrix(null, registry, statement)
		sectionByPillar(transformed3DMatrix, splitHeights, toolPillar, transform2Ds, workMesh)
		setSplitIndexesAttribute(statement, workMesh)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gWeld = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'weld',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var polygons = getPolygonsRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			return
		}
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		var stratas = getStratas(registry, statement)
		var transformed3DMatrix = getTransformed3DMatrix(null, registry, statement)
		var toolPillar = {polygons:polygons, stratas:stratas}
		var transform2Ds = getTransform2DsByChildren(statement.children, registry)
		weldByPillar(transformed3DMatrix, splitHeights, toolPillar, transform2Ds, workMesh)
		setSplitIndexesAttribute(statement, workMesh)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gConstructionProcessors = [gDrill, gEmboss, gSection, gWeld]

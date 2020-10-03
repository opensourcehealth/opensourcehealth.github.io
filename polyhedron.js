//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gClose = 0.0000001

function addToFacets(facets, isTriangular, polygonFacet) {
	if (!isTriangular || polygonFacet.length < 4) {
		facets.push(polygonFacet)
		return
	}
	for (facetIndex = 1; facetIndex < polygonFacet.length - 1; facetIndex++) {
		facets.push([polygonFacet[0], polygonFacet[facetIndex], polygonFacet[facetIndex + 1]])
	}
}

function addToLineKeysMap(edges, lineKeysMap) {
	edges.sort()
	lineKey = edges[0] + '#' + edges[1]
	for (edge of edges) {
		addArrayElementToMap(lineKey, edge, lineKeysMap)
	}
}

function getEdgeKey(aString, bString) {
	if (bString > aString) {
		return aString + ' ' + bString
	}
	return bString + ' ' + aString
}

function getEdgesByFacet(facet, z, zList) {
	var edges = []
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var vertexIndexNext = (vertexIndex + 1) % facet.length
		if ((zList[vertexIndex] < z) != (zList[vertexIndexNext] < z)) {
			edges.push(getEdgeKey(facet[vertexIndex].toString(), facet[vertexIndexNext].toString()))
		}
	}
	return edges
}

function getIsFacetPointingOutside(facet, mesh) {
	var normal = getNormalByFacet(facet, mesh.points)
	if (normal == null || facet.length < 3) {
		return false
	}
	var rotatedPoints = getListsCopy(mesh.points)
	var xyRotator = [normal[0], -normal[2]]
	for (rotatedPoint of rotatedPoints) {
		rotateXYZByBasis(gXZRotationBasis, rotatedPoint, xyRotator)
	}
	normal = getNormalByFacet(facet, rotatedPoints)
	xyRotator = [normal[0], -normal[1]]
	for (rotatedPoint of rotatedPoints) {
		rotateXYZByBasis(gXYRotationBasis, rotatedPoint, xyRotator)
	}
	normal = getNormalByFacet(facet, rotatedPoints)
	var midpoint = null
	if (facet.length % 2 == 0) {
		midpoint = rotatedPoints[facet[facet.length / 2]]
	}
	else {
		halfLengthMinusOne = (facet.length - 1) / 2
		midpoint = getXYZAddition(rotatedPoints[facet[halfLengthMinusOne]], rotatedPoints[facet[halfLengthMinusOne + 1]])
		multiplyXYZByScalar(midpoint, 0.5)
	}
	var rotatedMesh = {facets:mesh.facets, points:rotatedPoints}
	var xIntersections = getXIntersectionsByMesh(rotatedMesh, midpoint[1], midpoint[2])
	var numberOfIntersectionsToLeft = 0
	var midpointXPlus = midpoint[0] + gClose
	for (xIntersection of xIntersections) {
		if (xIntersection < midpointXPlus) {
			numberOfIntersectionsToLeft += 1
		}
	}
	return numberOfIntersectionsToLeft != 0 && numberOfIntersectionsToLeft % 2 == 0
}

function getLargeFacet(mesh) {
	var largeFacet = null
	var greatestMinimumLengthSquared = -1
	var points = mesh.points
	for (facet of mesh.facets) {
		var minimumLengthSquared = Number.MAX_VALUE
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var lengthSquared = getXYZLengthSquared(getXYZSubtraction(points[vertexIndex], points[nextIndex]))
			minimumLengthSquared = Math.min(lengthSquared, minimumLengthSquared)
		}
		if (minimumLengthSquared > greatestMinimumLengthSquared) {
			greatestMinimumLengthSquared = minimumLengthSquared
			largeFacet = facet
		}
	}
	return largeFacet
}

function getMeshAnalysis(mesh) {
	var arrowsMap = new Map()
	var facetsMap = new Map()
	var linkMap = new Map()
	var loneEdges = []
	var greatestFacetVertexes = -1
	var moreThanDoubleEdges = []
	var numberOfEdges = 0
	var numberOfShapes = 0
	var unidirectionalEdges = []
	var numberOfUnidirectionalEdges = 0
	for (facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
		facet = mesh.facets[facetIndex]
		if (facet.length > greatestFacetVertexes) {
			greatestFacetVertexes = facet.length
		}
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
			var arrow = facet[vertexIndex].toString() + ' ' + facet[nextIndex].toString()
			addArrayElementToMap(arrow, edgeKey, arrowsMap)
			addArrayElementToMap(facetIndex, edgeKey, facetsMap)
		}
		linkMap.set(facetIndex, null)
	}
	for (facetIndexes of facetsMap.values()) {
		var greatestFacetIndex = -1
		for (facetIndex of facetIndexes) {
			greatestFacetIndex = Math.max(greatestFacetIndex, facetIndex)
		}
		for (facetIndex of facetIndexes) {
			if (facetIndex != greatestFacetIndex) {
				linkMap.set(facetIndex, greatestFacetIndex)
			}
		}
	}
	for (arrows of arrowsMap.values()) {
		numberOfEdges += 1
		if (arrows.length == 1) {
			loneEdges.push(arrows[0])
		}
		else {
			if (arrows.length > 2) {
				moreThanDoubleEdges.push(arrows)
			}
			else {
				if (arrows[0] == arrows[1]) {
					unidirectionalEdges.push(arrows[0])
				}
			}
		}
	}
	for (link of linkMap.values()) {
		numberOfShapes += (link == null)
	}
	var largeFacet = getLargeFacet(mesh)
	var isFacetPointingOutside = 'Meaningless because mesh is incorrect.'
	var numberOfIncorrectEdges = loneEdges.length + moreThanDoubleEdges.length + unidirectionalEdges.length
	if (numberOfIncorrectEdges == 0) {
		isFacetPointingOutside = getIsFacetPointingOutside(getLargeFacet(mesh), mesh)
	}
	return {
		greatestFacetVertexes:greatestFacetVertexes,
		isFacetPointingOutside:isFacetPointingOutside,
		loneEdges:loneEdges,
		numberOfEdges:numberOfEdges,
		numberOfFacets:mesh.facets.length,
		numberOfIncorrectEdges:numberOfIncorrectEdges,
		numberOfShapes:numberOfShapes,
		moreThanDoubleEdges:moreThanDoubleEdges,
		unidirectionalEdges:unidirectionalEdges}
}

function getPillarMesh(isTriangular, polygons, polyheight, transform3D) {
	if (polygons.length == 0 || polyheight.length == 0) {
		return []
	}
	var facets = []
	var points = []
	for (polygon of polygons) {
		if (polygon.length > 0) {
			numberOfParameters = polygon[0].length
			for (heightIndex = 0; heightIndex < polyheight.length; heightIndex += 2) {
				var pointIndexStart = points.length
				var height = polyheight[heightIndex]
				if (numberOfParameters == 2) {
					var polygonFacet = []
					for (vertex of polygon) {
						polygonFacet.push(points.length)
						points.push([vertex[0], vertex[1], height])
					}
					addToFacets(facets, isTriangular, polygonFacet)
					polygonFacet = []
					height = polyheight[heightIndex + 1]
					for (vertex of polygon) {
						polygonFacet.push(points.length)
						points.push([vertex[0], vertex[1], height])
					}
					var polygonFacetCopy = polygonFacet.slice(0)
					polygonFacetCopy.reverse()
					addToFacets(facets, isTriangular, polygonFacetCopy)
				}
				for (vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
					var bottomLeftIndex = pointIndexStart + vertexIndex
					var bottomRightIndex = pointIndexStart + (vertexIndex + 1) % polygon.length
					var topLeftIndex = bottomLeftIndex + polygon.length
					var topRightIndex = bottomRightIndex + polygon.length
					var polygonFacet = [bottomLeftIndex, topLeftIndex, topRightIndex, bottomRightIndex]
					addToFacets(facets, isTriangular, polygonFacet)
				}
			}
		}
	}
	return {facets:facets, points:points}
}

function getNormalByFacet(facet, points) {
	if (facet.length < 3) {
		return null
	}
	var vectorA = normalizeXYZ(getXYZSubtraction(points[facet[1]], points[facet[0]]))
	var vectorB = normalizeXYZ(getXYZSubtraction(points[facet[2]], points[facet[0]]))
	if (Math.abs(getDotProduct(vectorA, vectorB)) > 0.9999999) {
		return null
	}
	return normalizeXYZ(getCrossProduct(vectorA, vectorB))
}

function getTriangleMeshString(filetype, id, mesh) {
	if (filetype.toLowerCase() != 'stl') {
		return null
	}
//solid your_name 
//facet normal
//  outer loop
//    vertex
//    vertex
//    vertex
//  endloop
//endfacet
//endsolid
	var meshStrings = ['solid ' + id]
	var points = mesh.points
	for (facet of mesh.facets) {
		var normal = getNormalByFacet(facet, points)
		var normalStrings = ['facet']
		if (normal != null) {
			normalStrings.push('normal')
			for (parameter of normal) {
				normalStrings.push(parameter.toFixed(2))
			}
		}
		meshStrings.push(normalStrings.join(' '))
		meshStrings.push('  outer loop')
		for (pointIndex of facet) {
			meshStrings.push('    vertex ' + points[pointIndex].toString().replace(/,/g, ' '))
		}
		meshStrings.push('  endloop')
		meshStrings.push('endfacet')
	}
	meshStrings.push('endsolid')
	return meshStrings.join('\n')
}

function getXIntersectionsByMesh(mesh, y, z) {
	var xIntersections = []
	var xyPolygons = getXYPolygonsByZ(mesh, z)
	for (xyPolygon of xyPolygons) {
		for (var vertexIndex = 0; vertexIndex < xyPolygon.length; vertexIndex++) {
			var vertex = xyPolygon[vertexIndex]
			var vertexNext = xyPolygon[(vertexIndex + 1) % xyPolygon.length]
			if ((vertex[1] < y) != (vertexNext[1] < y)) {
				deltaY = vertexNext[1] - vertex[1]
				beginPortion = (vertexNext[1] - y) / deltaY
				endPortion = 1.0 - beginPortion
				xIntersections.push(beginPortion * vertex[0] + endPortion * vertexNext[0])
			}
		}
	}
	return xIntersections
}

function getXYPolygonsByLineKeys(lineKeysMap, points, z) {
	polygonEdges = []
	for (var lineKeys of lineKeysMap.values()) {
		for (var lineKey of lineKeys) {
			if (lineKey != null) {
				var polygonEdge = []
				var edges = lineKey.split('#')
				var edgeEnd = edges[1]
				do {
					polygonEdge.push(edgeEnd)
					var endLineKeys = lineKeysMap.get(edgeEnd)
					var originalLineKey = lineKey
					var lineKey = null
					for (var endLineIndex = 0; endLineIndex < endLineKeys.length; endLineIndex++) {
						var endLineKey = endLineKeys[endLineIndex]
						if (endLineKey != originalLineKey) {
							lineKey = endLineKey
							endLineIndex = endLineKeys.length
							if (lineKey != null) {
								edges = lineKey.split('#')
								if (edgeEnd == edges[0]) {
									edgeEnd = edges[1]
								}
								else {
									edgeEnd = edges[0]
								}
							}
						}
					}
					for (var endLineIndex = 0; endLineIndex < endLineKeys.length; endLineIndex++) {
						endLineKeys[endLineIndex] = null
					}
					if (polygonEdge.length > 9876543) {
						console.log('polygon is too large or there is a mistake, length: ' + polygonEdge.length)
						console.log(lineKey)
						console.log(polygonEdge)
						lineKey = null
					}
				}
				while (lineKey != null)
				polygonEdge.pop()
				polygonEdges.push(polygonEdge)
			}
		}
	}
	var xyPolygons = []
	for (polygonEdge of polygonEdges) {
		var xyPolygon = []
		for (edge of polygonEdge) {
			var nodes = edge.split(' ')
			var begin = points[nodes[0]]
			var end = points[nodes[1]]
			var deltaZ = end[2] - begin[2]
			var beginPortion = (end[2] - z) / deltaZ
			var endPortion = 1.0 - beginPortion
			var xy = [beginPortion * begin[0] + endPortion * end[0], beginPortion * begin[1] + endPortion * end[1]]
			xyPolygon.push(xy)
		}
		xyPolygons.push(xyPolygon)
	}
	return xyPolygons
}

function getXYPolygonsByZ(mesh, z) {
	var facets = mesh.facets
	var lineKeysMap = new Map()
	var points = mesh.points
	for (facet of facets) {
		var zList = []
		for (vertex of facet) {
			zList.push(points[vertex][2])
		}
		var edges = getEdgesByFacet(facet, z, zList)
		if (edges.length == 2) {
			addToLineKeysMap(edges, lineKeysMap)
		}
	}
	return getXYPolygonsByLineKeys(lineKeysMap, points, z)
}

function getXYPolygonsMapByMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPolygonsMap = new Map()
	for (facet of facets) {
		var zList = []
		var maximumZ = -Number.MAX_VALUE
		var minimumZ = Number.MAX_VALUE
		for (vertex of facet) {
			var z = points[vertex][2]
			zList.push(z)
			maximumZ = Math.max(maximumZ, z)
			minimumZ = Math.min(minimumZ, z)
		}
		maximumZ = Math.floor(maximumZ + 1.001)
		minimumZ = Math.ceil(minimumZ)
		for (var z = minimumZ; z < maximumZ; z++) {
			var edges = getEdgesByFacet(facet, z, zList)
			if (edges.length == 2) {
				var lineKeysMap = null
				if (xyPolygonsMap.has(z)) {
					lineKeysMap = xyPolygonsMap.get(z)
				}
				else {
					lineKeysMap = new Map()
					xyPolygonsMap.set(z, lineKeysMap)
				}
				addToLineKeysMap(edges, lineKeysMap)
			}
		}
	}

 	for (entry of xyPolygonsMap) {
		var z = entry[0]
		xyPolygonsMap.set(z, getXYPolygonsByLineKeys(entry[1], points, z))
	}
	return xyPolygonsMap
}

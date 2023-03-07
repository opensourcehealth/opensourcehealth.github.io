//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addElementListsToSet(elementLists, setTo) {
	for (var elements of elementLists) {
		addElementsToSet(elements, setTo)
	}
}

function addElementsToMapArray(elements, key, mapTo) {
	if (mapTo.has(key)) {
		pushArray(mapTo.get(key), elements)
		return
	}
	mapTo.set(key, elements)
}

function addElementsToSet(elements, setTo) {
	for (var element of elements) {
		setTo.add(element)
	}
}

function addElementToArrays(arrays, index, value) {
	if (arrays[index] == undefined) {
		arrays[index] = [value]
	}
	else {
		arrays[index].push(value)
	}
}

function addElementToMapArray(element, key, mapTo) {
	if (mapTo.has(key)) {
		mapTo.get(key).push(element)
		return
	}
	mapTo.set(key, [element])
}

function addMapToMapArray(mapFrom, mapTo) {
	for (var entry of mapFrom.entries()) {
		addElementsToMapArray(entry[1], entry[0], mapTo)
	}
}

function arrayIsClose(elements, others) {
	if (elements.length != others.length) {
		return false
	}
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (Math.abs(elements[elementIndex] - others[elementIndex]) > gClose) {
			return false
		}
	}
	return true
}

function compareAbsoluteElementTwoAscending(a, b) {
	return Math.abs(a[2]) - Math.abs(b[2])
}

function compareArrayAscending(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return a[0][elementIndex] - b[0][elementIndex]
		}
	}
	return 0
}

function compareArrayDescending(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return b[0][elementIndex] - a[0][elementIndex]
		}
	}
	return 0
}

function compareFirstElementAscending(a, b) {
// in future rename to compareElementZero
	return a[0] - b[0]
}

function compareFirstElementDescending(a, b) {
	return b[0] - a[0]
}

function compareFirstThirdElementAscending(a, b) {
	if (Math.abs(a[0] - b[0]) < gClose) {
		return a[2] - b[2]
	}
	return a[0] - b[0]
}

function compareIDAscending(a, b) {
	return a.id > b.id
}

function compareNumberAscending(a, b) {
	return a - b
}

function compareNumberDescending(a, b) {
	return b - a
}

function compareSignedIntersectionAscending(a, b) {
	if (a[0] == b[0]) {
		return a[1] - b[1]
	}
	return a[0] - b[0]
}

function copyKeysExcept(exceptionSet, mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (!exceptionSet.has(key)) {
			mapTo.set(key, mapFrom.get(key))
		}
	}
}

/*
deprecated23
function copySetKeys(copySet, mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (copySet.has(key)) {
			mapTo.set(key, mapFrom.get(key))
		}
	}
}
*/

function copyMissingKeys(mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (!mapTo.has(key)) {
			mapTo.set(key, mapFrom.get(key))
		}
	}
}

function copyMissingKeysExcept(exceptionSet, mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (!exceptionSet.has(key)) {
			if (!mapTo.has(key)) {
				mapTo.set(key, mapFrom.get(key))
			}
		}
	}
}

function deleteElementsFromSet(elements, setFrom) {
	for (var element of elements) {
		setFrom.delete(element)
	}
}

function deleteKeysExcept(exceptionSet, map) {
	for (var key of map.keys()) {
		if (!exceptionSet.has(key)) {
			map.delete(key)
		}
	}
}

function getArrayArraysCopy(arrayArrays) {
	var arrayArraysCopy = new Array(arrayArrays.length)
	for (var arraysIndex = 0; arraysIndex < arrayArrays.length; arraysIndex++) {
		arrayArraysCopy[arraysIndex] = getArraysCopy(arrayArrays[arraysIndex])
	}
	return arrayArraysCopy
}

function getArrayByElements(elements, until, value) {
	value = getValueByDefault(0.0, value)
	elements = getArrayByValue(elements)
	until = getValueByDefault(elements.length, until)
	if (elements.length < until) {
		elements.length = until
	}
	for (var elementIndex = 0; elementIndex < until; elementIndex++) {
		elements[elementIndex] = getValueByDefault(value, elements[elementIndex])
	}
	return elements
}

function getArrayBySet(setForArray) {
	var array = new Array(setForArray.size)
	var index = 0
	for (var element of setForArray) {
		array[index] = element
		index += 1
	}
	return array
}

function getArrayByValue(value) {
	if (Array.isArray(value)) {
		return value
	}
	return [value]
}

function getArrayOrNullBySet(setForArray) {
	if (setForArray.size == 0) {
		return null
	}
	return getArrayBySet(setForArray)
}

function getArraysBySplittingStrings(strings, stringSeparator) {
	var arrays = new Array(strings.length)
	for (var stringIndex = 0; stringIndex < strings.length; stringIndex++) {
		arrays[stringIndex] = strings[stringIndex].split(stringSeparator)
	}
	return arrays
}

function getArraysCopy(arrays) {
	var arraysCopy = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		arraysCopy[arrayIndex] = arrays[arrayIndex].slice(0)
	}
	return arraysCopy
}

function getIsEmpty(array) {
	if (array == null || array == undefined) {
		return true
	}
	return array.length == 0
}

function getIsLong(array, minimumLength) {
	if (array == null || array == undefined) {
		return false
	}
	return array.length >= minimumLength
}

function getMapArraysCopy(mapFrom) {
	var mapCopy = new Map()
	for (var entry of mapFrom.entries()) {
		mapCopy.set(entry[0], entry[1].slice(0))
	}
	return mapCopy
}

function getNumberOfDifferences(arraysA, arraysB) {
	var numberOfDifferences = 0
	if (arraysA.length != arraysB.length) {
		return Math.abs(arraysA.length - arraysB.length)
	}
	for (var arrayIndex = 0; arrayIndex < arraysA.length; arrayIndex++) {
		var arrayA = arraysA[arrayIndex]
		var arrayB = arraysB[arrayIndex]
		if (arrayA.length != arrayB.length) {
			numberOfDifferences += Math.abs(arrayA.length - arrayB.length)
		}
		else {
			for (var elementIndex = 0; elementIndex < arrayA.length; elementIndex++) {
				if (arrayA[elementIndex] != arrayB[elementIndex]) {
					numberOfDifferences += 1
				}
			}
		}
	}
	return numberOfDifferences
}

function getNullOrValue(key, map) {
	if (map.has(key)) {
		return map.get(key)
	}
	return null
}

function getPushArray(elements, others) {
	if (elements == null) {
		return others
	}
	return pushArray(elements, others)
}

function getPushElement(arrayToAddTo, element) {
	if (arrayToAddTo == null) {
		return [element]
	}
	arrayToAddTo.push(element)
	return arrayToAddTo
}

function getSequence(length) {
	var sequence = new Array(length)
	for (var index = 0; index < length; index++) {
		sequence[index] = index
	}
	return sequence
}

function getShortArrays(length, points) {
	var shortArrays = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		shortArrays[pointIndex] = points[pointIndex].slice(0, length)
	}
	return shortArrays
}

function getStartIndex(elements) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var nextIndex = (elementIndex + 1) % elements.length
		if (elements[elementIndex] == null && elements[nextIndex] != null) {
			return nextIndex
		}
	}
	return null
}

function getStringByArrays(arrays) {
	var joinedArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		joinedArrays[arrayIndex] = arrays[arrayIndex].join(',')
	}
	return joinedArrays.join(' ')
}

function getValueByDefault(defaultValue, value) {
	if (value == undefined) {
		return defaultValue
	}
	return value
}

function notNullCheck(element) {
	return element != null
}

function overwriteArray(elements, sources) {
	elements.length = sources.length
	for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
}

function overwriteArraysUntil(elementArrays, sourceArrays, until) {
	for (var sourceArrayIndex = 0; sourceArrayIndex < sourceArrays.length; sourceArrayIndex++) {
		overwriteArrayUntil(elementArrays[sourceArrayIndex], sourceArrays[sourceArrayIndex], until)
	}
}

function overwriteArrayUntil(elements, sources, until) {
	for (var sourceIndex = 0; sourceIndex < until; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
}

function pushArray(elements, others) {
	if (others == null || others == undefined) {
		return elements
	}
	var elementsLength = elements.length
	var othersLength = others.length
	elements.length = elementsLength + othersLength
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[elementsLength] = others[otherIndex]
		elementsLength++
	}
	return elements
}

function removeNulls(elements) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] != null) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}
	elements.length = withoutNullLength
}

function removeNullsBySet(elements, nullIndexSet) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (!nullIndexSet.has(elementIndex)) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}
	elements.length = withoutNullLength
}

function removeRepeats(elements) {
	for (var elementIndex = elements.length - 1; elementIndex > -1; elementIndex--) {
		if (elements[elementIndex] == elements[(elementIndex + 1) % elements.length]) {
			elements.splice(elementIndex, 1)
		}
	}
}

function removeCollectionElementsByIterable(collection, iterable) {
	for (var element of iterable) {
		collection.delete(element)
	}
}

function removeShortArrays(arrays, length) {
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (arrays[arrayIndex] != null) {
			if (arrays[arrayIndex].length < length) {
				arrays[arrayIndex] = null
			}
		}
	}
	removeNulls(arrays)
}

function replaceElements(elements, find, replacement) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] == find) {
			elements[elementIndex] = replacement
		}
	}
}

function reverseArrays(elements) {
	for (var element of elements) {
		element.reverse()
	}
}

function setMapIfMissing(key, map, value) {
	if (!map.has(key)) {
		map.set(key, value)
	}
}

//deprecated24
function setObjectAttribute(key, map, object, value) {
	if (map.has(key)) {
		value = map.get(key)(value)
	}
	return object[key] = value
}

function setUndefinedElementsToArray(elements, sources) {
	var minimumLength = Math.min(elements.length, sources.length)
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = getValueByDefault(sources[parameterIndex], elements[parameterIndex])
	}
}

function setUndefinedElementsToValue(elements, value) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = getValueByDefault(value, elements[parameterIndex])
	}
}

function spliceArray(elements, index, others) {
	elements.length = elements.length + others.length
	elementsLengthMinus = elements.length - 1
	var fromIndex = elementsLengthMinus - others.length
	for (var toIndex = elementsLengthMinus; toIndex >= index; toIndex--) {
		elements[toIndex] = elements[fromIndex]
		fromIndex--
	}
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[index] = others[otherIndex]
		index++
	}
}



/*

abstract date=22.07.14 flipY=2 project=Antenna {

var antennaHeight=19 antennaHolderHeight=20 antennaHolderWidth=10 antennaMidpoint=126 back=194 clipHalfWidth=21/2 clipSocketInFront=30 crossHeight=50 crossHalfwidth=95 directorSpacing=136.3 extraRadioSide=8 gap=0.7 holeRadius=1.5 inset=4 ridgeWidth=4 riseZ=10 slotHeight=4 slotGap=0.4 slotInset=1 smoothLength=14 socketGap=0.1 socketOutset=3 springThickness=2 stemHalfwidth=22 stopperBack=12 stopperBackInset=10 stopperOutset=1.5 toothPeakAlong=0.5 top=15 vWidth=1.5 wallThickness=4 zigzagThickness=3

var antennaHolderHalfHeight=antennaHolderHeight/2 antennaRightMidpoint=back-antennaMidpoint-stopperBack clipBack=back-1.5*inset clipBegin=73+stopperBack clipFront=stopperBack+10 clipHalfWidthGap=clipHalfWidth+slotInset clipSocketLength=clipSocketInFront+10 crossFront=back-crossHeight filletRadius=1.5*inset floor1=inset-0.5 halfInset=inset/2 halfSpringThickness=springThickness/2 holeRadiusGap=holeRadius+gap quarterInset=inset/4 slotPeak=slotHeight+2 stopperTop=top+top toothOuter=(1.0-toothPeakAlong)*smoothLength

var centerStopperFront=149+halfInset centerRidgeBack=back-halfInset-1 centerRidgeFront=crossFront+halfInset+1  centerHoleY=clipBack-clipHalfWidth-wallThickness-10 clipSlopedBack=clipBegin+clipSocketInFront clipHalfSocket=clipHalfWidth+wallThickness floor3=top-halfInset forkThickness=slotPeak+wallThickness holeRadiusPlus=holeRadiusGap+wallThickness rightHeight=crossHeight+wallThickness slotRight=crossHalfwidth-3*slotInset-filletRadius smoothInner=stemHalfwidth+filletRadius+1  stopperTipSide=inset+halfInset toothHeight=toothPeakAlong*halfInset

var antennaSocketTop=top-floor1 centerRidgeBackBend=centerRidgeBack-2 centerRidgeFrontBend=centerRidgeFront+2*slotInset centerRidgeRight=slotRight-slotGap clipSlopedFront=clipSlopedBack-clipSocketLength clipHalfSocketGap=clipHalfSocket+socketGap floor2=0.5*(floor1+floor3) forkToothThickness=forkThickness+gap holeRiseZ=antennaRightMidpoint+antennaHolderHalfHeight-rightHeight rightHeightMinus=rightHeight-halfInset smoothSlotInner=smoothInner+2 toothBottom=toothOuter+wallThickness toothTop=rightHeight-toothOuter topRidgeFront=rightHeight-halfInset-1

var antennaSocketMiddle=top-floor2 centerRidgeLeft=centerRidgeRight-ridgeWidth forkTop=2*forkToothThickness+top rightStart=smoothSlotInner+gap smoothSlotOuter=smoothSlotInner+12 stopperLength=clipSlopedFront-clipFront
var holeX=directorSpacing-rightStart holeY=forkTop/2+top/2+antennaHeight/2 slotLeft=centerRidgeLeft-slotGap stopperBottomOutset=stopperOutset*halfInset/(antennaSocketMiddle-halfInset)

var antennaRightBack=holeY+holeRadiusPlus barRight=slotLeft-filletRadius-2*slotInset-rightStart holeRiseX=holeX-holeRadiusGap-wallThickness/2 smoothOuter=slotLeft-3 squareRight=crossHalfwidth-rightStart squareTop=forkTop-forkThickness toothRight=smoothSlotOuter-gap-rightStart

var antennaRightWidth=holeX+3*holeRadius+wallThickness barLeft=barRight-wallThickness riseBegin=slotRight+2*slotInset-rightStart riseEnd=squareRight+1

window transform3D=basis(x y) id=topView transform=translate(border(),-border()-topByID()){
var clipHalfSocketGapV=clipHalfSocketGap-vWidth
sculpture alterations=bevel,view bevels=inset id=antenna_center stratas=bracket() {
mirrorJoin alterations=fillet id=centerPolygon radius=filletRadius points=,back smoothInner, smoothOuter, crossHalfwidth, ,crossFront smoothOuter, smoothInner, stemHalfwidth, ,stopperBack ,0 -stemHalfwidth,
layer heights=0,floor1 id=centerBase {
copyPoints work=centerPolygon
}
layer heights=floor2,floor3,top {
copyPoints work=centerPolygon
mirrorJoin direction=90 points=halfInset,clipFront stopperTipSide,clipFront+quarterInset clipHalfSocketGap, ,clipSlopedFront-halfInset clipHalfSocketGap,clipSlopedFront clipHalfSocketGapV,clipSlopedBack clipHalfWidthGap, fillet(,clipBack,halfInset) 0,
}
layer heights=stopperTop-halfInset,stopperTop {
mirrorJoin alterations=fillet checkLength=false radius=filletRadius points=stemHalfwidth-stopperBackInset,stopperBack stemHalfwidth,stopperBack*0.7 stemHalfwidth,0.0 -stemHalfwidth,
}
}
bend amplitudes=0,0,0,socketOutset stratas=floor3-1,top+1 work=antenna_center {
rectangle id=bendClipRectangle points=clipHalfSocketGapV-1,clipFront-1 clipHalfSocketGap+1,clipSlopedFront-1
}
bend amplitudes=0,0,0,-socketOutset stratas=floor3-1,top+1 work=antenna_center {
copyPoints alterations=mirror direction=90 work=bendClipRectangle
}
bend amplitudes=0,0,0,socketOutset stratas=floor1-1,floor2+1 work=antenna_center {
rectangle id=bendClipBottom points=clipHalfSocketGapV-1,clipFront-1 clipHalfSocketGap+1,clipSlopedBack+1
}
bend amplitudes=0,0,0,-socketOutset stratas=floor1-1,floor2+1 work=antenna_center {
copyPoints alterations=mirror direction=90 work=bendClipBottom
}
bevel bevels=halfInset stratas=bracket(top) work=antenna_center {
rectangle points=stemHalfwidth-1,stopperBack+1 crossHalfwidth+2,back+2 id=outsideClip
copyPoints alterations=mirror direction=90 work=outsideClip
}
bevel bevels=halfInset stratas=bracket(stopperTop) work=antenna_center {
rectangle points=-stemHalfwidth-1,-1 stemHalfwidth+1,stopperBack+1
}
bend amplitudes=0,-stopperOutset stratas=bracket(floor2) work=antenna_center {
rectangle id=bendCenterBottom points=-clipHalfSocketGap-socketOutset-1,clipFront-1 clipHalfSocketGap+socketOutset+1,clipFront+quarterInset+1
}
bend amplitudes=0,-stopperBottomOutset stratas=bracket(top) work=antenna_center {
copyPoints work=bendCenterBottom
}
bevel bevels=halfInset stratas=bracket(top) work=antenna_center {
rectangle points=-clipHalfWidthGap-1,clipBack-inset clipHalfWidthGap+1,clipBack+1 id=outsideClip
}
bend amplitudes=0,0,0,quarterInset stratas=bracket(top) work=antenna_center {
rectangle id=bendBackRight points=clipHalfWidthGap-1,clipSlopedBack-1 clipHalfWidthGap+1,clipBack-inset
}
bend amplitudes=0,0,0,-quarterInset stratas=bracket(top) work=antenna_center {
copyPoints alterations=mirror direction=90 work=bendBackRight
}

pillar heights=0,slotHeight/2,slotHeight id=centerRidge {
mirrorJoin points=centerRidgeLeft+quarterInset,centerRidgeFront centerRidgeLeft,centerRidgeFrontBend ,centerRidgeBackBend centerRidgeLeft+quarterInset,centerRidgeBack centerRidgeRight-quarterInset,
}
bend amplitudes=0,slotHeight stratas=bracket(slotHeight) work=centerRidge {
rectangle points=slotLeft,centerRidgeFront-1 slotRight,centerRidgeFrontBend+1
}
bend amplitudes=0,-slotHeight stratas=bracket(slotHeight) work=centerRidge {
rectangle points=slotLeft,centerRidgeBackBend-1 slotRight,centerRidgeBack+1
}

emboss tools=centerRidge work=antenna_center {
matrix2D planes=, -centerRidgeLeft-centerRidgeRight,
}

wedge heights=2 id=textWedge inset=0.4 {
lettering fontHeight=12 text=PLA textAlign=0.5 transform=translate(0,10) scale(-1,1)
}
emboss bottomTools=textWedge stratas=bracket(0) work=antenna_center

mirrorJoin display=none id=centerSlotPolygon points=slotLeft,-3 ,slotHeight+quarterInset/2 slotLeft+quarterInset,slotPeak slotRight-quarterInset,

polygon id=aroundCorner points=holeX-holeRadiusPlus,antennaRightBack antennaRightWidth, antennaRightWidth,holeY-holeRadiusPlus+2 slotRight+wallThickness-rightStart,0
polygon id=untilTooth points=slotLeft-wallThickness-rightStart,0 barLeft,forkThickness-1.7*springThickness parabolaToQuantity([0,forkThickness-springThickness],4,false) ,forkThickness toothRight, toothRight+wallThickness,

g transform=translate(rightStart,crossFront) {
sculpture alterations=view id=antenna_right {
var rightFilletRadius=1.2*(halfInset+gap)
layer heights=0,wallThickness {
polygon alterations=fillet points=pointsByID(untilTooth) barLeft, ,forkTop-forkThickness mirrorJoin() pointsByID(aroundCorner) radius=rightFilletRadius
rectangle alterations=reverse,fillet points=barRight,forkThickness squareRight,forkTop-forkThickness radius=rightFilletRadius
}
layer heights=rightHeight {
polygon alterations=fillet points=pointsByID(untilTooth) squareRight, ,squareTop mirrorJoin() pointsByID(aroundCorner) radius=rightFilletRadius
}
}

}

rectangle id=backSplitRectangle points=-1,forkTop/2 toothRight+wallThickness/2,forkTop-forkThickness+halfSpringThickness
split splitHeights=toothBottom,smoothLength+wallThickness,rightHeight-smoothLength,toothTop work=antenna_right {
copyPoints work=backSplitRectangle
}
bend amplitudes=0,0 toothBottom,-gap-toothHeight smoothLength+wallThickness,-gap rightHeight-smoothLength,-gap toothTop,-gap-toothHeight rightHeight,0 splitIDs=backSplit stratas=toothBottom-gap,toothTop+gap vector=z work=antenna_right {
copyPoints work=backSplitRectangle
}

rectangle id=frontSplitRectangle points=-1,forkThickness-halfSpringThickness toothRight+wallThickness/2,forkTop/2
split splitHeights=toothBottom,toothTop work=antenna_right {
copyPoints work=frontSplitRectangle
}
bend amplitudes=0,gap stratas=toothBottom-1,toothTop+1 vector=z work=antenna_right {
copyPoints work=frontSplitRectangle
}

difference id=rightSlot splitInsides=wallThickness+1 work=antenna_right {
copyPoints transform=translate(-rightStart,squareTop) work=centerSlotPolygon
}
bevel bevels=1,0 intersectionIDs=rightSlot work=antenna_right

pillar heights=-slotHeight,-slotHeight/2,0 id=rightRidge {
mirrorJoin display=none points=centerRidgeLeft-rightStart+quarterInset,topRidgeFront centerRidgeLeft-rightStart,topRidgeFront-halfInset ,0 centerRidgeRight-rightStart,
}
bend amplitudes=0,-slotHeight stratas=-slotHeight-1,-slotHeight/2-1 work=rightRidge {
rectangle points=slotLeft-rightStart,topRidgeFront-halfInset-1 slotRight-rightStart,topRidgeFront+1
}

bend amplitudes=0,0,-(stopperTop-halfInset-top)/2 stopperBack,0,0 stratas=stopperTop-halfInset-1,stopperTop+1 vector=y work=antenna_center {
rectangle points=-stemHalfwidth-1,-1 stemHalfwidth+1,stopperBack+1
}

var clipHalfSocketV=clipHalfSocket-vWidth clipSocketPeakBack=clipSocketLength-21
var clipSocketPeakFront=clipSocketPeakBack-2
var clipSocketRest=clipSocketPeakFront-6
sculpture alterations=view id=antenna_socket {
layer heights=0,halfInset {
mirrorJoin points=clipHalfSocketV,clipSocketLength clipHalfSocket,-quarterInset stopperTipSide, halfInset,0 -halfInset,
}
layer heights=antennaSocketMiddle,antennaSocketTop {
mirrorJoin points=clipHalfWidthGap,wallThickness clipHalfWidth+0.1,clipSocketRest clipHalfWidth,clipSocketPeakFront ,clipSocketPeakBack fillet(clipHalfWidthGap,clipSocketLength) clipHalfSocketV, clipHalfSocket,-quarterInset stopperTipSide, halfInset,0 -halfInset,
}
}
bend amplitudes=clipSocketRest,0,-1 clipSocketPeakFront,0,1.0 clipSocketPeakBack,0,1.0 clipSocketLength,0,-halfInset+0.5 stratas=1,halfInset+1 vector=y work=antenna_socket {
rectangle points=-clipHalfWidthGap-1,clipSocketRest clipHalfWidthGap+1,clipSocketLength
}
bend amplitudes=0,0,0,socketOutset stratas=bracket(antennaSocketMiddle) work=antenna_socket {
rectangle id=bendSocketRectangle points=clipHalfSocketV-0.1,-1 clipHalfSocket+1,clipSocketLength+1
}
bend amplitudes=0,0,0,-socketOutset stratas=bracket(antennaSocketMiddle) work=antenna_socket {
copyPoints alterations=mirror direction=90 work=bendSocketRectangle
}
bend amplitudes=0,stopperOutset stratas=bracket(antennaSocketMiddle) work=antenna_socket {
rectangle id=bendSocketBottom points=-clipHalfSocket-socketOutset-1,-1 clipHalfSocket+socketOutset+1,1
}
bend amplitudes=0,stopperBottomOutset stratas=-1,quarterInset work=antenna_socket {
copyPoints work=bendSocketBottom
}

var halfZigzagThickness=zigzagThickness/2 
var halfStopperBase=halfInset-halfZigzagThickness/4 halfStopperWidth=clipHalfSocket+socketOutset-halfZigzagThickness-gap zigzagBack=stopperLength-halfZigzagThickness+0.7
var stopperDiagonalDeltaY=(halfStopperWidth-halfStopperBase)/4
var stopperLadderFront=halfZigzagThickness+stopperDiagonalDeltaY stopperLadderBack=zigzagBack-stopperDiagonalDeltaY
var ladderSteps=intervalsFromToQuantity(stopperLadderFront, stopperLadderBack, 8, false, false)
pillar alterations=view heights=0,halfInset,antennaSocketMiddle,antennaSocketTop id=antenna_stopper {
outline outset=halfZigzagThickness {
mirrorJoin alterations=fillet radius=zigzagThickness points=halfStopperBase,zigzagBack halfStopperWidth,stopperLadderBack ,ladderSteps[7] zigzagThickness, ,ladderSteps[6] halfStopperWidth, ,ladderSteps[5] zigzagThickness, ,ladderSteps[4] halfStopperWidth, ,ladderSteps[3] zigzagThickness, ,ladderSteps[2] halfStopperWidth, ,ladderSteps[1] zigzagThickness, ,ladderSteps[0] halfStopperWidth, ,stopperLadderFront halfStopperBase,halfZigzagThickness -halfStopperBase,
}
}
bend amplitudes=0,-stopperOutset stratas=bracket(antennaSocketMiddle) work=antenna_stopper {
rectangle id=bendStopperBottom points=-halfStopperWidth-1,-1 halfStopperWidth+1,0.5*(stopperLadderFront+ladderSteps[0])
}
bend amplitudes=0,stopperOutset stratas=bracket(antennaSocketMiddle) work=antenna_stopper {
rectangle id=bendStopperTop points=-halfStopperWidth-1,0.5*(stopperLadderBack+ladderSteps[7]) halfStopperWidth+1,zigzagBack+zigzagThickness
}
bend amplitudes=0,-stopperBottomOutset stratas=-1,quarterInset work=antenna_stopper {
copyPoints work=bendStopperBottom
}
bend amplitudes=0,stopperBottomOutset stratas=-1,quarterInset work=antenna_stopper {
copyPoints work=bendStopperTop
}

}

window transform3D=basis(x z) id=frontView transform=translate(border(),-border()-border()-topByID(topView)-topByID()) {

emboss bottomTools=rightRidge stratas=-forkTop/2,0 work=antenna_right

difference id=centerSlot splitInsides=inset+quarterInset work=antenna_center {
copyPoints work=centerSlotPolygon
matrix2D planes=, -slotLeft-slotRight,
}

bevel bevels=1,0 intersectionIDs=centerSlot work=antenna_center

}

window transform3D=basis(y z) id=rightView transform=translate(border()+border()+rightByID(topView),-border()-topByID(topView)) scale(1,-1) rotate(-90){

split splitHeights=-smoothSlotOuter,-smoothSlotInner,smoothSlotInner,smoothSlotOuter work=antenna_center {
rectangle points=crossFront-filletRadius,top-1 back+filletRadius,top+1
}

split splitHeights=holeRiseX,riseBegin stratas=-1,toothRight work=antenna_right {
rectangle display=none points=forkTop-forkThickness-1,rightHeight-1 forkTop-forkThickness,rightHeight+1
}
split splitHeights=riseEnd work=antenna_right
triangleAnalysis work=antenna_right
}

window transform3D=basis(,-1, x) id=topRotatedView transform=translate(border(),-border()-topByID(topView)) {

wedge heights=1.5 id=frequencyWedge inset=0.01 {
lettering fontHeight=12 text=446.625 MHz _text=446.625 MHz textAlign=0 transform=translate(-37,-6) scale(-1,1)
}
}

window transform3D=basis(x y) id=topViewCopy transform=translate(border(),-border()-topByID(topView)) {

emboss bottomTools=frequencyWedge stratas=bracket(0) work=antenna_center

bevel bevels=smoothLength-halfInset stratas=bracket(top) work=antenna_center {
rectangle id=smoothSlope points=smoothInner+1,crossFront-1 smoothSlotOuter+1,back+1
copyPoints alterations=mirror direction=90 work=smoothSlope
}

difference id=centerHole splitInsides=slotInset work=antenna_center {
regularPolygon cx=0 cy=centerHoleY r=clipHalfWidth
polygon alterations=fillet id=centerLightening points=smoothOuter-1,crossFront+inset+halfInset+1 ,back-inset-halfInset-1 smoothSlotOuter+1,back-smoothLength-1 ,crossFront+smoothLength+1 radius=filletRadius
copyPoints alterations=mirror direction=90 work=centerLightening
}
bevel bevels=-slotInset splitIDs=centerHole work=antenna_center

difference id=hole splitInsides=slotInset work=antenna_right {
polygon alterations=outset,reverse,fillet clockwise=true radius=holeRadiusGap outset=holeRadiusGap points=holeX,holeY holeX+2*holeRadius,
polygon alterations=fillet points=riseEnd+2*slotInset,forkTop-wallThickness/2 ,forkThickness+wallThickness/4 holeRiseX-wallThickness/2,holeY-2*holeRadiusGap-0.75*wallThickness ,holeY+holeRadiusGap radius=filletRadius
}
bevel bevels=slotInset intersectionIDs=hole work=antenna_right
triangleAnalysis work=antenna_right

bend amplitudes=riseBegin,0,0 riseEnd,0,riseZ holeRiseX,0,holeRiseZ stratas=bracket(rightHeight,2*wallThickness) work=antenna_right {
rectangle points=riseBegin,-1 antennaRightWidth+1,antennaRightBack+1
}
triangleAnalysis work=antenna_right

bend amplitudes=riseEnd,0,0 antennaRightWidth,0,antennaRightMidpoint-antennaHolderHalfHeight stratas=stratas=bracket(0,2*wallThickness) work=antenna_right {
rectangle points=riseEnd,-1 antennaRightWidth+1,antennaRightBack+1
}
triangleAnalysis work=antenna_right

assembly alterations=view {
copyMesh work=antenna_center
copyMesh transform3D=translate(0,clipSlopedFront,antennaSocketTop+floor1) rotateY(180) work=antenna_socket
copyMesh transform3D=translate(0,clipFront,antennaSocketTop+floor1) rotateY(180) work=antenna_stopper
copyMesh transform3D=translate(rightStart,back+wallThickness,-gap-forkThickness) rotateX(90) work=antenna_right
}

move alterations=stl,triangleAnalysis bedSize=250,210 transform3D=rotateZ(90) work=antenna_center

copyMesh alterations=mirror,move,stl,view bedSize=180 direction=90 output=antenna_left work=antenna_right

move alterations=stl,triangleAnalysis bedSize=180 work=antenna_right

move alterations=stl,triangleAnalysis bedSize=180 work=antenna_socket

move alterations=stl,triangleAnalysis bedSize=180 work=antenna_stopper

}







abstract date=22.07.14 flipY=2 project=Antenna {

var antennaHeight=19 antennaHolderHeight=20 antennaHolderWidth=10 antennaMidpoint=126 back=194 clipHalfWidth=21/2 clipSocketInFront=30 crossHeight=50 crossHalfwidth=95 directorSpacing=136.3 extraRadioSide=8 gap=0.7 holeRadius=1.5 inset=4 ridgeWidth=4 riseZ=10 slotHeight=4 slotGap=0.4 slotInset=1 smoothLength=14 socketGap=0.1 socketOutset=3 springThickness=2 stemHalfwidth=22 stopperBack=12 stopperBackInset=10 stopperOutset=1.5 toothPeakAlong=0.5 top=15 vWidth=1.5 wallThickness=4 zigzagThickness=3

var buckleInset=1 buttonFlatLength=2 buttonSlopedLength=8 catchThickness=8 handleThickness=15 narrowingSlope=0.1 prongGap=4 railBaseTop=5 railCapThickness=2 railGap=0.1+.2*1 railRadius=2 railSlopeThickness=5 railSlopeWidth=4

var antennaHolderHalfHeight=antennaHolderHeight/2 antennaRightMidpoint=back-antennaMidpoint-stopperBack clipBack=back-1.5*inset clipBegin=73+stopperBack clipFront=stopperBack+10 clipHalfWidthGap=clipHalfWidth+slotInset clipSocketLength=clipSocketInFront+10 crossFront=back-crossHeight filletRadius=1.5*inset floor1=inset-0.5 halfInset=inset/2 halfSpringThickness=springThickness/2 holeRadiusGap=holeRadius+gap quarterInset=inset/4 slotPeak=slotHeight+2 stopperTop=top+top toothOuter=(1.0-toothPeakAlong)*smoothLength

var centerStopperFront=149+halfInset centerRidgeBack=back-halfInset-1 centerRidgeFront=crossFront+halfInset+1  centerHoleY=clipBack-clipHalfWidth-wallThickness-10 clipSlopedBack=clipBegin+clipSocketInFront clipHalfSocket=clipHalfWidth+wallThickness floor3=top-halfInset forkThickness=slotPeak+wallThickness holeRadiusPlus=holeRadiusGap+wallThickness rightHeight=crossHeight+wallThickness slotRight=crossHalfwidth-3*slotInset-filletRadius smoothInner=stemHalfwidth+filletRadius+1  stopperTipSide=inset+halfInset toothHeight=toothPeakAlong*halfInset

var antennaSocketTop=top-floor1 centerRidgeBackBend=centerRidgeBack-2 centerRidgeFrontBend=centerRidgeFront+2*slotInset centerRidgeRight=slotRight-slotGap clipSlopedFront=clipSlopedBack-clipSocketLength clipHalfSocketGap=clipHalfSocket+socketGap floor2=0.5*(floor1+floor3) forkToothThickness=forkThickness+gap holeRiseZ=antennaRightMidpoint+antennaHolderHalfHeight-rightHeight rightHeightMinus=rightHeight-halfInset smoothSlotInner=smoothInner+2 toothBottom=toothOuter+wallThickness toothTop=rightHeight-toothOuter topRidgeFront=rightHeight-halfInset-1

var antennaSocketMiddle=top-floor2 centerRidgeLeft=centerRidgeRight-ridgeWidth forkTop=2*forkToothThickness+top rightStart=smoothSlotInner+gap smoothSlotOuter=smoothSlotInner+12 stopperLength=clipSlopedFront-clipFront
var holeX=directorSpacing-rightStart holeY=forkTop/2+top/2+antennaHeight/2 slotLeft=centerRidgeLeft-slotGap stopperBottomOutset=stopperOutset*halfInset/(antennaSocketMiddle-halfInset)

var antennaRightBack=holeY+holeRadiusPlus barRight=slotLeft-filletRadius-2*slotInset-rightStart holeRiseX=holeX-holeRadiusGap-wallThickness/2 smoothOuter=slotLeft-3 squareRight=crossHalfwidth-rightStart squareTop=forkTop-forkThickness toothRight=smoothSlotOuter-gap-rightStart

var antennaRightWidth=holeX+3*holeRadius+wallThickness barLeft=barRight-wallThickness riseBegin=slotRight+2*slotInset-rightStart riseEnd=squareRight+1


var halfWallThickness=0.5*wallThickness railLeft=extraRadioSide+stemHalfwidth railBaseLeftFront=crossFront+halfInset+1 springLength=60 railLength=springLength+buttonFlatLength+buttonSlopedLength

var railRight=railLeft+railLength

var springLeft=railRight-springLength

var buttonFlatLeft=springLeft-buttonFlatLength

var handleMiddleX=directorSpacing-holeRadiusGap-wallThickness+1 handleRight=directorSpacing+holeRadiusGap+wallThickness

var doubleRailGap=2*railGap railSlopeTop=railBaseTop+railSlopeThickness railSlope=railSlopeThickness/railSlopeWidth

var buckleBaseNearLeftBack=railBaseLeftFront-doubleRailGap-buckleInset buckleBaseTop=railBaseTop+railSlope*buckleInset narrowing=narrowingSlope*railLength railCapTop=railSlopeTop+railCapThickness

var buckleBaseNearRightBack=buckleBaseNearLeftBack+narrowing+narrowingSlope*halfWallThickness buckleMiddleNearLeftBack=buckleBaseNearLeftBack-railSlopeWidth buckleSlopeTop=buckleBaseTop+railSlopeThickness railBaseBack=railBaseLeftFront+narrowing+wallThickness railBaseRightFront=railBaseLeftFront+narrowing railCapLeftFront=railBaseLeftFront-railSlopeWidth

var buckleBaseFarFront=railBaseBack+buckleInset buckleMiddleNearRightBack=buckleBaseNearRightBack-railSlopeWidth buckleMiddleTop=buckleSlopeTop+railCapThickness railCapBack=railBaseBack+railSlopeWidth railCapRightFront=railBaseRightFront-railSlopeWidth

var buckleBaseBack=railCapBack+buckleInset+wallThickness buckleBaseNearFront=railCapLeftFront-buckleInset-wallThickness buckleMiddleFarFront=buckleBaseFarFront+railSlopeWidth buckleTop=antennaHeight+holeRadiusGap+wallThickness

var buckleMiddleFarBack=buckleMiddleFarFront+wallThickness

var prongBottom=buckleMiddleFarBack+prongGap

var springTop=prongBottom+springThickness

var prongTop=springTop+springThickness

var catchTop=prongTop+catchThickness


window transform3D=basis(x y) id=topView transform=translate(border(),-border()-topByID()){

var clipHalfSocketGapV=clipHalfSocketGap-vWidth

sculpture alterations=bevel,view bevels=inset id=antenna_center stratas=bracket() {
mirrorJoin alterations=fillet id=centerPolygon radius=filletRadius points=,back smoothInner, smoothOuter, crossHalfwidth, ,crossFront smoothOuter, smoothInner, stemHalfwidth, ,stopperBack ,0 -stemHalfwidth,
layer heights=0,floor1 id=centerBase {
copyPoints work=centerPolygon
}
layer heights=floor2,floor3,top {
copyPoints work=centerPolygon
mirrorJoin direction=90 points=halfInset,clipFront stopperTipSide,clipFront+quarterInset clipHalfSocketGap, ,clipSlopedFront-halfInset clipHalfSocketGap,clipSlopedFront clipHalfSocketGapV,clipSlopedBack clipHalfWidthGap, fillet(,clipBack,halfInset) 0,
}
layer heights=stopperTop-halfInset,stopperTop {
mirrorJoin alterations=fillet checkLength=false radius=filletRadius points=stemHalfwidth-stopperBackInset,stopperBack stemHalfwidth,stopperBack*0.7 stemHalfwidth,0.0 -stemHalfwidth,
}
}
bend amplitudes=0,0,0,socketOutset stratas=floor3-1,top+1 work=antenna_center {
rectangle id=bendClipRectangle points=clipHalfSocketGapV-1,clipFront-1 clipHalfSocketGap+1,clipSlopedFront-1
}
bend amplitudes=0,0,0,-socketOutset stratas=floor3-1,top+1 work=antenna_center {
copyPoints alterations=mirror direction=90 work=bendClipRectangle
}
bend amplitudes=0,0,0,socketOutset stratas=floor1-1,floor2+1 work=antenna_center {
rectangle id=bendClipBottom points=clipHalfSocketGapV-1,clipFront-1 clipHalfSocketGap+1,clipSlopedBack+1
}
bend amplitudes=0,0,0,-socketOutset stratas=floor1-1,floor2+1 work=antenna_center {
copyPoints alterations=mirror direction=90 work=bendClipBottom
}
bevel bevels=halfInset stratas=bracket(top) work=antenna_center {
rectangle points=stemHalfwidth-1,stopperBack+1 crossHalfwidth+2,back+2 id=outsideClip
copyPoints alterations=mirror direction=90 work=outsideClip
}
bevel bevels=halfInset stratas=bracket(stopperTop) work=antenna_center {
rectangle points=-stemHalfwidth-1,-1 stemHalfwidth+1,stopperBack+1
}
bend amplitudes=0,-stopperOutset stratas=bracket(floor2) work=antenna_center {
rectangle id=bendCenterBottom points=-clipHalfSocketGap-socketOutset-1,clipFront-1 clipHalfSocketGap+socketOutset+1,clipFront+quarterInset+1
}
bend amplitudes=0,-stopperBottomOutset stratas=bracket(top) work=antenna_center {
copyPoints work=bendCenterBottom
}
bevel bevels=halfInset stratas=bracket(top) work=antenna_center {
rectangle points=-clipHalfWidthGap-1,clipBack-inset clipHalfWidthGap+1,clipBack+1 id=outsideClip
}
bend amplitudes=0,0,0,quarterInset stratas=bracket(top) work=antenna_center {
rectangle id=bendBackRight points=clipHalfWidthGap-1,clipSlopedBack-1 clipHalfWidthGap+1,clipBack-inset
}
bend amplitudes=0,0,0,-quarterInset stratas=bracket(top) work=antenna_center {
copyPoints alterations=mirror direction=90 work=bendBackRight
}


polygon id=filletRegion points=railLeft-1,-1 ,buckleMiddleFarBack+1 railLeft-1, ,springTop+1 handleRight+1, ,-1

sculpture alterations=triangleAnalysis,view id=rail {

layer heights=0,railBaseTop {
polygon alterations=fillet points=railLeft,railBaseLeftFront ,railBaseBack railRight, ,railBaseRightFront radius=railRadius region=filletRegion
}

layer connectionAngle=10 heights=railSlopeTop,railCapTop vertical=false {
polygon alterations=fillet points=railLeft,railCapLeftFront ,railCapBack railRight, ,railCapRightFront radius=railRadius region=filletRegion
}

}

sculpture alterations=triangleAnalysis,view id=buckle {

var handleFront=antennaMidpoint+stopperBack-antennaHolderHeight/2 buckleStopperX=railRight+halfWallThickness

var prongPastCatch=15 springTriangleLength=8

var pressureLeft=springLeft+prongPastCatch

polyline id=prong points=railLeft,buckleMiddleFarBack railRight, ,prongBottom-1 parabolaToQuantity([pressureLeft+springTriangleLength,prongBottom],4,false) pressureLeft,prongBottom-springThickness/2 fillet(railLeft,prongBottom) fillet(,springTop) buttonFlatLeft,prongTop springLeft, ,springTop railRight+wallThickness, handleMiddleX,handleFront+antennaHolderHeight handleRight, ,handleFront handleMiddleX, railRight,buckleBaseNearFront

layer heights=0,buckleBaseTop {
polygon alterations=fillet points=railLeft,buckleBaseNearFront ,buckleBaseNearLeftBack buckleStopperX,buckleBaseNearRightBack ,buckleBaseFarFront railLeft, pointsByID(prong) radius=railRadius region=filletRegion
}

layer connectionAngle=10 heights=buckleSlopeTop,buckleMiddleTop vertical=false {
polygon alterations=fillet points=railLeft,buckleBaseNearFront ,buckleMiddleNearLeftBack buckleStopperX,buckleMiddleNearRightBack ,buckleMiddleFarFront railLeft, pointsByID(prong) radius=railRadius region=filletRegion
}

layer heights=buckleTop vertical=true {

polygon alterations=fillet points=railLeft,buckleBaseNearFront pointsByID(prong) radius=railRadius region=filletRegion
}

}

pillar alterations=triangleAnalysis,view heights=buckleTop id=catch {
polygon points=fillet(railLeft,prongTop+springThickness,railRadius) fillet(,catchTop,railRadius) fillet(springLeft+buttonSlopedLength,,railRadius) fillet(,springTop+springThickness,railRadius) springLeft,springTop ,prongTop buttonFlatLeft,
}


pillar heights=0,slotHeight/2,slotHeight id=centerRidge {
mirrorJoin points=centerRidgeLeft+quarterInset,centerRidgeFront centerRidgeLeft,centerRidgeFrontBend ,centerRidgeBackBend centerRidgeLeft+quarterInset,centerRidgeBack centerRidgeRight-quarterInset,
}
bend amplitudes=0,slotHeight stratas=bracket(slotHeight) work=centerRidge {
rectangle points=slotLeft,centerRidgeFront-1 slotRight,centerRidgeFrontBend+1
}
bend amplitudes=0,-slotHeight stratas=bracket(slotHeight) work=centerRidge {
rectangle points=slotLeft,centerRidgeBackBend-1 slotRight,centerRidgeBack+1
}

emboss tools=centerRidge work=antenna_center {
matrix2D planes=, -centerRidgeLeft-centerRidgeRight,
}

wedge heights=2 id=textWedge inset=0.4 {
lettering fontHeight=12 text=PLA textAlign=0.5 transform=translate(0,10) scale(-1,1)
}
emboss bottomTools=textWedge stratas=bracket(0) work=antenna_center

mirrorJoin display=none id=centerSlotPolygon points=slotLeft,-3 ,slotHeight+quarterInset/2 slotLeft+quarterInset,slotPeak slotRight-quarterInset,

polygon id=aroundCorner points=holeX-holeRadiusPlus,antennaRightBack antennaRightWidth, antennaRightWidth,holeY-holeRadiusPlus+2 slotRight+wallThickness-rightStart,0
polygon id=untilTooth points=slotLeft-wallThickness-rightStart,0 barLeft,forkThickness-1.7*springThickness parabolaToQuantity([0,forkThickness-springThickness],4,false) ,forkThickness toothRight, toothRight+wallThickness,

g transform=translate(rightStart,crossFront) {
sculpture alterations=view id=antenna_right {
var rightFilletRadius=1.2*(halfInset+gap)
layer heights=0,wallThickness {
polygon alterations=fillet points=pointsByID(untilTooth) barLeft, ,forkTop-forkThickness mirrorJoin() pointsByID(aroundCorner) radius=rightFilletRadius
rectangle alterations=reverse,fillet points=barRight,forkThickness squareRight,forkTop-forkThickness radius=rightFilletRadius
}
layer heights=rightHeight {
polygon alterations=fillet points=pointsByID(untilTooth) squareRight, ,squareTop mirrorJoin() pointsByID(aroundCorner) radius=rightFilletRadius
}
}

}

rectangle id=backSplitRectangle points=-1,forkTop/2 toothRight+wallThickness/2,forkTop-forkThickness+halfSpringThickness
split splitHeights=toothBottom,smoothLength+wallThickness,rightHeight-smoothLength,toothTop work=antenna_right {
copyPoints work=backSplitRectangle
}
bend amplitudes=0,0 toothBottom,-gap-toothHeight smoothLength+wallThickness,-gap rightHeight-smoothLength,-gap toothTop,-gap-toothHeight rightHeight,0 splitIDs=backSplit stratas=toothBottom-gap,toothTop+gap vector=z work=antenna_right {
copyPoints work=backSplitRectangle
}

rectangle id=frontSplitRectangle points=-1,forkThickness-halfSpringThickness toothRight+wallThickness/2,forkTop/2
split splitHeights=toothBottom,toothTop work=antenna_right {
copyPoints work=frontSplitRectangle
}
bend amplitudes=0,gap stratas=toothBottom-1,toothTop+1 vector=z work=antenna_right {
copyPoints work=frontSplitRectangle
}

difference id=rightSlot splitInsides=wallThickness+1 work=antenna_right {
copyPoints transform=translate(-rightStart,squareTop) work=centerSlotPolygon
}
bevel bevels=1,0 intersectionIDs=rightSlot work=antenna_right

pillar heights=-slotHeight,-slotHeight/2,0 id=rightRidge {
mirrorJoin display=none points=centerRidgeLeft-rightStart+quarterInset,topRidgeFront centerRidgeLeft-rightStart,topRidgeFront-halfInset ,0 centerRidgeRight-rightStart,
}
bend amplitudes=0,-slotHeight stratas=-slotHeight-1,-slotHeight/2-1 work=rightRidge {
rectangle points=slotLeft-rightStart,topRidgeFront-halfInset-1 slotRight-rightStart,topRidgeFront+1
}

bend amplitudes=0,0,-(stopperTop-halfInset-top)/2 stopperBack,0,0 stratas=stopperTop-halfInset-1,stopperTop+1 vector=y work=antenna_center {
rectangle points=-stemHalfwidth-1,-1 stemHalfwidth+1,stopperBack+1
}

var clipHalfSocketV=clipHalfSocket-vWidth clipSocketPeakBack=clipSocketLength-21
var clipSocketPeakFront=clipSocketPeakBack-2
var clipSocketRest=clipSocketPeakFront-6
sculpture alterations=view id=antenna_socket {
layer heights=0,halfInset {
mirrorJoin points=clipHalfSocketV,clipSocketLength clipHalfSocket,-quarterInset stopperTipSide, halfInset,0 -halfInset,
}
layer heights=antennaSocketMiddle,antennaSocketTop {
mirrorJoin points=clipHalfWidthGap,wallThickness clipHalfWidth+0.1,clipSocketRest clipHalfWidth,clipSocketPeakFront ,clipSocketPeakBack fillet(clipHalfWidthGap,clipSocketLength) clipHalfSocketV, clipHalfSocket,-quarterInset stopperTipSide, halfInset,0 -halfInset,
}
}
bend amplitudes=clipSocketRest,0,-1 clipSocketPeakFront,0,1.0 clipSocketPeakBack,0,1.0 clipSocketLength,0,-halfInset+0.5 stratas=1,halfInset+1 vector=y work=antenna_socket {
rectangle points=-clipHalfWidthGap-1,clipSocketRest clipHalfWidthGap+1,clipSocketLength
}
bend amplitudes=0,0,0,socketOutset stratas=bracket(antennaSocketMiddle) work=antenna_socket {
rectangle id=bendSocketRectangle points=clipHalfSocketV-0.1,-1 clipHalfSocket+1,clipSocketLength+1
}
bend amplitudes=0,0,0,-socketOutset stratas=bracket(antennaSocketMiddle) work=antenna_socket {
copyPoints alterations=mirror direction=90 work=bendSocketRectangle
}
bend amplitudes=0,stopperOutset stratas=bracket(antennaSocketMiddle) work=antenna_socket {
rectangle id=bendSocketBottom points=-clipHalfSocket-socketOutset-1,-1 clipHalfSocket+socketOutset+1,1
}
bend amplitudes=0,stopperBottomOutset stratas=-1,quarterInset work=antenna_socket {
copyPoints work=bendSocketBottom
}

var halfZigzagThickness=zigzagThickness/2 
var halfStopperBase=halfInset-halfZigzagThickness/4 halfStopperWidth=clipHalfSocket+socketOutset-halfZigzagThickness-gap zigzagBack=stopperLength-halfZigzagThickness+0.7
var stopperDiagonalDeltaY=(halfStopperWidth-halfStopperBase)/4
var stopperLadderFront=halfZigzagThickness+stopperDiagonalDeltaY stopperLadderBack=zigzagBack-stopperDiagonalDeltaY
var ladderSteps=intervalsFromToQuantity(stopperLadderFront, stopperLadderBack, 8, false, false)
pillar alterations=view heights=0,halfInset,antennaSocketMiddle,antennaSocketTop id=antenna_stopper {
outline outset=halfZigzagThickness {
mirrorJoin alterations=fillet radius=zigzagThickness points=halfStopperBase,zigzagBack halfStopperWidth,stopperLadderBack ,ladderSteps[7] zigzagThickness, ,ladderSteps[6] halfStopperWidth, ,ladderSteps[5] zigzagThickness, ,ladderSteps[4] halfStopperWidth, ,ladderSteps[3] zigzagThickness, ,ladderSteps[2] halfStopperWidth, ,ladderSteps[1] zigzagThickness, ,ladderSteps[0] halfStopperWidth, ,stopperLadderFront halfStopperBase,halfZigzagThickness -halfStopperBase,
}
}
bend amplitudes=0,-stopperOutset stratas=bracket(antennaSocketMiddle) work=antenna_stopper {
rectangle id=bendStopperBottom points=-halfStopperWidth-1,-1 halfStopperWidth+1,0.5*(stopperLadderFront+ladderSteps[0])
}
bend amplitudes=0,stopperOutset stratas=bracket(antennaSocketMiddle) work=antenna_stopper {
rectangle id=bendStopperTop points=-halfStopperWidth-1,0.5*(stopperLadderBack+ladderSteps[7]) halfStopperWidth+1,zigzagBack+zigzagThickness
}
bend amplitudes=0,-stopperBottomOutset stratas=-1,quarterInset work=antenna_stopper {
copyPoints work=bendStopperBottom
}
bend amplitudes=0,stopperBottomOutset stratas=-1,quarterInset work=antenna_stopper {
copyPoints work=bendStopperTop
}

}

window transform3D=basis(x z) id=frontView transform=translate(border(),-border()-border()-topByID(topView)-topByID()) {

difference work=buckle {
truncatedTeardrop cx=directorSpacing cy=antennaHeight maximumBridge=1.2*holeRadiusGap overhangAngle=10 r=holeRadiusGap tipDirection=-90
}

emboss bottomTools=rightRidge stratas=-forkTop/2,0 work=antenna_right

difference id=centerSlot splitInsides=inset+quarterInset work=antenna_center {
copyPoints work=centerSlotPolygon
matrix2D planes=, -slotLeft-slotRight,
}

bevel bevels=1,0 intersectionIDs=centerSlot work=antenna_center

}

window transform3D=basis(y z) id=rightView transform=translate(border()+border()+rightByID(topView),-border()-topByID(topView)) scale(1,-1) rotate(-90){

split splitHeights=-smoothSlotOuter,-smoothSlotInner,smoothSlotInner,smoothSlotOuter work=antenna_center {
rectangle points=crossFront-filletRadius,top-1 back+filletRadius,top+1
}

split splitHeights=holeRiseX,riseBegin stratas=-1,toothRight work=antenna_right {
rectangle display=none points=forkTop-forkThickness-1,rightHeight-1 forkTop-forkThickness,rightHeight+1
}
split splitHeights=riseEnd work=antenna_right
triangleAnalysis work=antenna_right
}

window transform3D=basis(,-1, x) id=topRotatedView transform=translate(border(),-border()-topByID(topView)) {

wedge heights=1.5 id=frequencyWedge inset=0.01 {
lettering fontHeight=12 text=446.625 MHz _text=446.625 MHz textAlign=0 transform=translate(-37,-6) scale(-1,1)
}
}

window transform3D=basis(x y) id=topViewCopy transform=translate(border(),-border()-topByID(topView)) {

emboss bottomTools=frequencyWedge stratas=bracket(0) work=antenna_center

bevel bevels=smoothLength-halfInset stratas=bracket(top) work=antenna_center {
rectangle id=smoothSlope points=smoothInner+1,crossFront-1 smoothSlotOuter+1,back+1
copyPoints alterations=mirror direction=90 work=smoothSlope
}

difference id=centerHole splitInsides=slotInset work=antenna_center {
regularPolygon cx=0 cy=centerHoleY r=clipHalfWidth
polygon alterations=fillet id=centerLightening points=smoothOuter-1,crossFront+inset+halfInset+1 ,back-inset-halfInset-1 smoothSlotOuter+1,back-smoothLength-1 ,crossFront+smoothLength+1 radius=filletRadius
copyPoints alterations=mirror direction=90 work=centerLightening
}
bevel bevels=-slotInset splitIDs=centerHole work=antenna_center

difference id=hole splitInsides=slotInset work=antenna_right {
polygon alterations=outset,reverse,fillet clockwise=true radius=holeRadiusGap outset=holeRadiusGap points=holeX,holeY holeX+2*holeRadius,
polygon alterations=fillet points=riseEnd+2*slotInset,forkTop-wallThickness/2 ,forkThickness+wallThickness/4 holeRiseX-wallThickness/2,holeY-2*holeRadiusGap-0.75*wallThickness ,holeY+holeRadiusGap radius=filletRadius
}
bevel bevels=slotInset intersectionIDs=hole work=antenna_right
triangleAnalysis work=antenna_right

bend amplitudes=riseBegin,0,0 riseEnd,0,riseZ holeRiseX,0,holeRiseZ stratas=bracket(rightHeight,2*wallThickness) work=antenna_right {
rectangle points=riseBegin,-1 antennaRightWidth+1,antennaRightBack+1
}
triangleAnalysis work=antenna_right

bend amplitudes=riseEnd,0,0 antennaRightWidth,0,antennaRightMidpoint-antennaHolderHalfHeight stratas=stratas=bracket(0,2*wallThickness) work=antenna_right {
rectangle points=riseEnd,-1 antennaRightWidth+1,antennaRightBack+1
}
triangleAnalysis work=antenna_right

assembly alterations=view {
copyMesh work=antenna_center
copyMesh transform3D=translate(0,clipSlopedFront,antennaSocketTop+floor1) rotateY(180) work=antenna_socket
copyMesh transform3D=translate(0,clipFront,antennaSocketTop+floor1) rotateY(180) work=antenna_stopper
copyMesh transform3D=translate(rightStart,back+wallThickness,-gap-forkThickness) rotateX(90) work=antenna_right
}

move alterations=stl,triangleAnalysis bedSize=250,210 transform3D=rotateZ(90) work=antenna_center

copyMesh alterations=mirror,move,stl,view bedSize=180 direction=90 output=antenna_left work=antenna_right

move alterations=stl,triangleAnalysis bedSize=180 work=antenna_right

move alterations=stl,triangleAnalysis bedSize=180 work=antenna_socket

move alterations=stl,triangleAnalysis bedSize=180 work=antenna_stopper

}

*/

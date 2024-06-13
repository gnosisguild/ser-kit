// export const encodeExecution = (path: ExecutionPath): string => {
// }

// /** Splits the execution path into segments at all Safe nodes that require extra signatures for execution to continue. */
// export const splitExecutableSegments = (
//   path: ExecutionPath
// ): ExecutionPath[] => {
//   const segments: ExecutionPath[] = []
//   let currentSegment: ExecutionPath = []
//   for (const node of path) {
//     currentSegment.push(node)
//     if (node.type === NodeType.Safe) {
//       segments.push(currentSegment)
//       currentSegment = []
//     }
//   }
//   if (currentSegment.length > 0) {
//     segments.push(currentSegment)
//   }
//   return segments
// }


export interface TMKState {
  name: string;
  goalInvocation?: {
    goalReference: string;
    type: string;
    actualArguments: string[];
  };
}

export interface TMKTransition {
  sourceState: string;
  targetState: string;
  dataCondition?: string;
}

export interface TMKOrganizer {
  startState: string;
  successState: string;
  failureState: string;
  states: TMKState[];
  transitions: TMKTransition[];
}

/**
 * State labels can be strings
 */
type StateType = IndexType;

/**
 * Action labels can be strings
 */
export type ActionNameType = IndexType;

/**
 * Represents a state and data and its corresponding data.
 */
export type State<S extends StateType, D = {}> = Readonly<D> & {
  readonly stateName: S;
}

/**
 * Give Actions to nextState() to (maybe) trigger a transition.
 */
export type Action<Name extends ActionNameType, Payload> = Readonly<Payload> & { 
  readonly actionName: Name 
};

///
/// Errors
///

/**
 * Represents a compiler error message. Error brands prevent really clever users from naming their states as one of the error messages
 * and subverting error checking. Yet, the compiler still displays the string at the end of the failed cast indicating what the
 * issue is rather than something puzzling like could not assign to never.
 */
type ErrorBrand<T> = Readonly<T> & { _errorBrand: void };

// type NotAStateTypeError = 'The passed state value is not a state type. States must be string, number, or boolean literal.';
type StateAlreadyDeclaredError = 'The specified state has already been declared.';
type TransitionAlreadyDeclaredError = 'This transition has already been declared.';
type IllegalStateError = 'The specified state has not been declared or the other keys/values in the state object are invalid or missing.';
type IllegalTransitionError = 'No transition exists from the current state to the returned next state.';
type ActionAlreadyDeclared = 'An action with this label has already been declared.';
type NoSuchActionLabel = 'No action exists with this actionName.';
type HandlerNotAState = 'The returned value is not a state';
type NoHandlerForState = 'A state is missing from the handler map';
type HandlerDeclaredForUnknownState = '';

//type InferState<S> = S extends MaybeValidatedState<infer S, any> ? S : ErrorBrand<'Passed object is not a state'>;

type IndexType = string | number | symbol;

/// Validators
type AssertSInState<States, S> = S extends States ? S : ErrorBrand<IllegalStateError>;
type AssertNewState<S extends StateType, States> = S extends States ? ErrorBrand<StateAlreadyDeclaredError> : S;
type AssertNewTransition<S extends IndexType, N extends IndexType, Transitions> = S extends keyof Transitions ? N extends Transitions[S] ? ErrorBrand<TransitionAlreadyDeclaredError> : N : N;
type AssertActionNotDefined<AN extends ActionNameType, ActionNames extends IndexType> = AN extends ActionNames ? ErrorBrand<ActionAlreadyDeclared> : AN;
type AssertActionNameLegal<ActionNames, ActionName> = ActionName extends ActionNames ? ActionName : ErrorBrand<NoSuchActionLabel>;
// type AssertHandlerMapComplete<StateNames extends StateType, Map> = [keyof Map] extends [StateNames] ? [StateNames] extends [keyof Map] ? Map : ErrorBrand<NoHandlerForState> : ErrorBrand<HandlerDeclaredForUnknownState>;

/**
 * Private
 * The state machine definitiion.
 */
type StateMachineDefinition<StateLabels extends string, ActionLabels extends ActionNameType, States, Actions> = {
  handlers: {
    [s in StateLabels]: {
      [h in ActionLabels]?: (curState: States, action: Actions) => States;
    };
  };
};

///
/// stateMachine() builder
///

/**
 * A builder from calling stateMachine().
 */
export type StateMachineBuilder = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<{}>;
}

type StateMachineFunc = () => StateMachineBuilder;

///
/// .state() builder
///

/**
 * A builder from calling .state()
 */
export type StateBuilder<StateMap> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<StateMap>;

  readonly transition: TransitionFunc<StateMap, never>;
}

/**
 * The signature for calling the state function in the builder.
 */
type StateFunc<StateMap> = <S extends StateType, Data = {}>(
  state: AssertNewState<S, keyof StateMap>
) => StateBuilder<StateMap & { [key in S]: State<S, Data> }>;

///
/// .transition() builder
///

/**
 * The builder returned by .transition()
 */
export type TransitionBuilder<StateMap, Transitions> = {
  /**
   * Add a transition to this state machine.
   */
  readonly transition: TransitionFunc<StateMap, Transitions>;

  readonly action: ActionFunc<StateMap, Transitions, never>;
}

/**
 * The signature of .transition()
 */
export type TransitionFunc<StateMap, Transitions> = <S extends keyof StateMap, N extends keyof StateMap>(
  curState: S,
  nextState: AssertNewTransition<S, N, Transitions>
  // No idea why, but it's very important that our transition map goes from stateKey -> State
  // *not* stateKey -> stateKey. When we try to compare statekeys alone when searching for valid
  // transitions based on the return type of an action handler, Typescript will widen
  // the return type if you try to compare against just the key. Creating a State<S, D> from the
  // template args and looking that up in the tranistion map does work.
) => TransitionBuilder<StateMap, Transitions | Transition<S, N>>;

///
/// .action() builder
///

export type ActionBuilder<
  StateMap,
  Transitions,
  ActionsMap
> = {
  readonly action: ActionFunc<StateMap, Transitions, ActionsMap>;
  
  readonly actionHandler: ActionHandlerFunc<
    StateMap,
    Transitions,
    ActionsMap
  >;
};

export type ActionFunc<
  StateMap,
  Transitions,
  ActionsMap
> = <AN extends ActionNameType, AP = {}>(actionName: AssertActionNotDefined<AN, keyof ActionsMap>) => ActionBuilder<StateMap, Transitions, ActionsMap & { [k in AN]: Action<AN, AP> }>;

///
/// .actionsHandler() builder.
///

/**
 * The builder returned by .actionHandler()
 */
export type ActionHandlersBuilder<StateMap, Transitions, ActionsMap> = {
  readonly actionHandler: ActionHandlerFunc<StateMap, Transitions, ActionsMap>;

  readonly done: () => StateMachine<StateMap, ActionsMap>,
}

type Transition<CS extends StateType, NS extends StateType> = {
  current: CS;
  next: NS;
};

/**
 * The Signature of .actionHandler().
 */
export type ActionHandlerFunc<
  StateMap,
  Transitions,
  ActionsMap
> = <
  CS extends keyof StateMap,
  NS extends StateType,
  ND,
  AN extends keyof ActionsMap,
> (
  state: CS,
  action: AN,
  handler: (curState: StateMap[CS], action: ActionsMap[AN]) => (
    NS extends keyof StateMap
    ? State<NS, ND> extends StateMap[NS]
    // ? keyof Transitions extends keyof StateMap
    ? Transition<'b', 'a'> extends Transitions
    ? State<NS, ND>
    : never
    : never
    : never
    //: never
  )
    
    
    
) => ActionHandlersBuilder<StateMap, Transitions, ActionsMap>;

type ActionHandlerCallback<
  StateMap,
  Transitions,
  ActionsMap,
  CS extends keyof StateMap,
  NSS extends keyof StateMap,
  NDD,
  NS extends State<NSS, NDD>,
  AN extends keyof ActionsMap,
> = (state: StateMap[CS], action: ActionsMap[AN]) => 
    CS extends keyof Transitions
    ? NSS extends Transitions[CS]
    //? NSS extends Transitions[CS]
    ? Readonly<NS>
    : ErrorBrand<IllegalTransitionError>
    : ErrorBrand<IllegalTransitionError>
    //: ErrorBrand<'poop'>;
    //: ErrorBrand<HandlerNotAState>;
    
///
/// .done()
///
type DoneFunc<States, Actions> = () => StateMachine<States, Actions>;

/**
 * A state machine
 */
export type StateMachine<StateMap, ActionMap> = {
  nextState: (curState: StateMap[keyof StateMap], action: ActionMap[keyof ActionMap]) => StateMap[keyof StateMap],
};

export const stateMachine: StateMachineFunc = (): StateMachineBuilder => {
  const stateFunc = state<{}>();

  return {
    state: stateFunc,
  };
}

const state = <StateMap>(): StateFunc<StateMap> => {
  return <S extends StateType, D = {}>(_s: AssertNewState<S, keyof StateMap>) => {
    type NewStateMap = StateMap & { [k in S]: State<S, D> };

    const transitionFunc = transition<NewStateMap, never>();
    const stateFunc = state<NewStateMap>()

    const builder = {
      state: stateFunc,
      transition: transitionFunc,
    };

    return builder;
  }
}

const transition = <StateMap, Transitions>(): TransitionFunc<StateMap, Transitions> => {
  return <S extends keyof StateMap, N extends keyof StateMap>(_curState: S, _next: AssertNewTransition<S, N, Transitions>) => {
    type NewTransitions = Transitions & { [s in S]: N };

    const transitionFunction = transition<StateMap, NewTransitions>();
    const actionFunc = action<StateMap, NewTransitions, {}>();

    return {
      transition: transitionFunction,
      action: actionFunc,
    };
  };
}

const action = <StateMap, Transitions, ActionMap>(): ActionFunc<StateMap, Transitions, ActionMap> => {
  return <AN extends ActionNameType, AP = {}>(_actionName: AssertActionNotDefined<AN, keyof ActionMap>) => {
    type NewActionMap = ActionMap & { [key in AN]: Action<AN, AP> };

    const actionFunc: any = action<StateMap, Transitions, NewActionMap>()
    const actionHandlerFunc = actionHandler<StateMap, Transitions, NewActionMap>();

    return {
      action: actionFunc,
      actionHandler: actionHandlerFunc,
    };
  }
}

const actionHandler = <StateMap, Transitions, ActionMap>(): ActionHandlerFunc<StateMap, Transitions, ActionMap> => {
  return <CS extends keyof StateMap, NS extends StateMap[keyof StateMap], AN extends keyof ActionMap>(state: CS, action: AN, handler: ActionHandlerCallback<StateMap, Transitions, ActionMap, CS, NS, AN>) => {
    const doneFunc: any = done<StateMap, Transitions, ActionMap>();
    const actionHandlerFunc: any = actionHandler<StateMap, Transitions, ActionMap>();

    return { 
      actionHandler: actionHandlerFunc,
      done: doneFunc
    };
  };
};

const done = <StateMap, Transitions, ActionMap>() => {
  return (): StateMachine<StateMap, ActionMap> => {
    const nextStateFunction = (curState: StateMap[keyof StateMap], action: ActionMap[keyof ActionMap]): StateMap[keyof StateMap] => {
      return null!;
    };

    return {
      nextState: nextStateFunction
    };
  }
}

const x = stateMachine()
  .state('a')
  .state<'b', {foo: 'horse'}>('b')
  .state('c')
  .transition('a', 'b')
  .transition('b', 'c')
  .action<'a1', {foo: 27}>('a1')
  .action('a2')
  .actionHandler("a", "a1", (c, a) => {
    return {
      stateName: 'a',
      foo: 'horse'
    } as const;
  })
  /*.actionHandlers({
    a: {
      a1: () => {
        return {
          state: 'b' as const,
        }
      }
    },
    b: {}
  })
  .done();
*/
